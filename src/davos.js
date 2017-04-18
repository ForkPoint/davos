(function () {
  'use strict';

  // Constants
  const ROOT_DIR = '.',
    ARCHIVE_NAME = 'cartridges.zip';

  // Imports
  const fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    walk = require('walk'),
    yazl = require('yazl'),
    del = require('del'),
    Queue = require('sync-queue'),
    chokidar = require('chokidar'),
    md5File = require('md5-file'),
    xmldoc = require('xmldoc');

  // Locals
  const config = require('./config'),
    WebDav = require('./webdav'),
    log = require('./logger');

  class Davos {
    constructor (conf) {
      this.conf = conf;
      return this;
    }

    activateCodeVersion () {
      let webdav = new WebDav(this.conf);
      webdav.login();
      webdav.activateCodeVersion();
    }

    clean () {

    }

    copy () {

    }

    zipCartridges (archiveName) {
      const self = this;

      return new Promise(function (resolve, reject) {
        config.validateConfigProperties(self.conf);

        let archive = new yazl.ZipFile(),
          srcPath = path.resolve(ROOT_DIR),
          cartridges = (self.conf.cartridge.constructor === Array) ? self.conf.cartridge : [self.conf.cartridge];

        if (cartridges.length < 1) {
          reject();
          return;
        }

        walk.walkSync(srcPath, {
          filters: config.IGNORED_DIRECTORY_NAMES,
          listeners: {
            names: function (root, nodeNamesArray) {
              nodeNamesArray.sort(function (a, b) {
                if (a > b) return -1;
                if (a < b) return 1;
                return 0;
              });
            },
            directories: function (root, dirStatsArray, next) {
              let absolutePath = path.resolve(root, dirStatsArray[0].name),
                relativePath = path.relative(srcPath, absolutePath);

              if (config.isValidCartridgePath(relativePath, cartridges)) {
                archive.addEmptyDirectory(relativePath);
              }

              next();
            },
            file: function (root, fileStats, next) {
              let absolutePath = path.resolve(root, fileStats.name),
                relativePath = path.relative(srcPath, absolutePath);

              if (config.isValidCartridgePath(relativePath, cartridges)) {
                archive.addFile(absolutePath, relativePath);
              }

              next();
            }
          }
        });

        archive.end();

        archive.outputStream
          .pipe(fs.createWriteStream(archiveName))
          .on('close', function () {
            log.info(chalk.cyan('Archive created.'));
            resolve();
          });

      });
    }

    deleteCartridges() {
      const self = this;

      return new Promise(function (resolve, reject) {
        let queue = new Queue(),
          webdav = new WebDav(self.conf),
          cartridges = (self.conf.cartridge.constructor === Array) ? self.conf.cartridge : [self.conf.cartridge];

        if (cartridges.length < 1) {
          reject();
          return;
        }

        cartridges.forEach(function (cartridge) {
          queue.place(function () {
            return webdav.delete(cartridge);
          });
        });

      });
    }

    upload () {
      const self = this;

      let webdav = new WebDav(self.conf),
        archiveName = path.join(ROOT_DIR, ARCHIVE_NAME);

      return new Promise(function (resolve) {
          // @TODO I can't figure out how to trigger .then without resolve()
          resolve();
        }).then(function () {
          log.info(chalk.cyan(`Creating archive of all cartridges.`));
          return self.zipCartridges(archiveName);
        }).then(function () {
          log.info(chalk.cyan(`Uploading archive.`));
          return webdav.put(archiveName);
        }).then(function () {
          log.info(chalk.cyan(`Unzipping archive.`));
          return webdav.unzip(archiveName);
        }).then(function () {
          log.info(chalk.cyan(`Removing archive.`));
          return webdav.delete(archiveName);
        }).then(function () {
          log.info(chalk.cyan(`Cartriges uploaded.`));
          return del(archiveName).then(function () {});
        }, function (err) {
          log.error(err);
          return del(archiveName).then(function () {});
        });
    }

    watch () {
      const self = this;

      log.info('Waiting for initial scan completion');

      let queue = new Queue(),
        webdav = new WebDav(self.conf),
        allCartridges = (self.conf.cartridge.constructor === Array) ? self.conf.cartridge : [self.conf.cartridge],
        excludesWithDotFiles = self.conf.exclude.concat([/[\/\\]\./]),
        watchHashList = [],
        isFirstUseFiles = true,
        isFirstUseDirectories = true,
        hash,
        watcher = chokidar.watch(allCartridges, {
          ignored: excludesWithDotFiles,
          persistent: true,
          atomic: true,
          ignorePermissionErrors: true,
          awaitWriteFinish: {
            stabilityThreshold: 3000,
            pollInterval: 100
          }
        });

      watcher
          .on('ready', () => {
            log.info('Initial scan complete. Ready for changes');
            isFirstUseFiles = false;
            isFirstUseDirectories = false;
          })
          .on('add', p => {
            hash = md5File.sync(p);

            watchHashList.push({
              filePath: p,
              md5sum: hash
            });

            if (!isFirstUseFiles) {
              log.info(`File ${p} has been added`);

              queue.place(function () {
                return webdav.put(p)
                  .then(function () {
                    log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                    queue.next();
                  }, function(err) {
                    log.error(err);
                    queue.next();
                  });
              });
            }
          })
          .on('addDir', p => {
            if (!isFirstUseDirectories) {
              log.info(`Directory ${p} has been added`);

              queue.place(function () {
                return webdav.mkcol(p)
                  .then(function () {
                    log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                    queue.next();
                  }, function(err) {
                    log.error(err);
                    queue.next();
                  });
              });
            }
          })
          .on('change', (p) => { // arguments: p, stats
            let changedFile = watchHashList.find(x => x.filePath === p);

            hash = md5File.sync(p);

            if (!changedFile) {
              changedFile = {
                filePath: p,
                md5sum: hash
              };
              watchHashList.push(changedFile);
            }

            if (changedFile.md5sum !== hash) {
              changedFile.md5sum = hash;
              log.info(`File ${p} has been changed`);
              queue.place(function () {
                return webdav.put(p)
                  .then(function () {
                    log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                    queue.next();
                  }, function(err) {
                    log.debug(err);
                    queue.next();
                  });
              });
            }
          })
          .on('unlink', path => {
            let removedFile = watchHashList.find(x => x.filePath === path),
              indexOfRemovedFile = watchHashList.indexOf(removedFile);

            if (indexOfRemovedFile != -1) {
              watchHashList.splice(indexOfRemovedFile, 1);
            }

            log.info(`File ${path} has been removed`);

            queue.place(function () {
              return webdav.delete(path)
                .then(function() {
                  log.info(chalk.cyan(`Successfully deleted: ${path}`));
                  queue.next();
                }, function(err) {
                  log.error(err);
                  queue.next();
                });
            });
          })
          .on('unlinkDir', path => {
            log.info(`Directory ${path} has been removed`);

            queue.place(function () {
              return webdav.delete(path)
                .then(function () {
                  log.info(chalk.cyan(`Successfully deleted: ${path}`));
                  queue.next();
                }, function(err) {
                  log.error(err);
                  queue.next();
                });
            });
          })
          .on('error', function(err) {
            log.error('Error while watching with chokidar:', err, '\nRestarting watch...');
          });
    }

    sync () {
      const self = this;

      let webdav = new WebDav(self.conf),
        clearRemoteOnlyCartridges = (!self.conf.delete) ? self.conf.D : self.conf.delete;

      if (clearRemoteOnlyCartridges === undefined) {
        clearRemoteOnlyCartridges = false;
      }

      webdav.propfind()
          .then(function(res) {
            let doc = new xmldoc.XmlDocument(res),
              responseNodes = doc.childrenNamed('response'),
              nodesLen = responseNodes.length,
              workingDirectory = self.conf.basePath || process.cwd(),
              cartridges = config.getCartridges(workingDirectory, []),
              cartridgesOnServer = [],
              localCartridges = [],
              differentCartridges = [],
              hasMatchedCartridges = false;

            for (let i = 0; i < nodesLen; i++) {
              if (i === 0) {
                continue;
              }
              cartridgesOnServer.push(responseNodes[i].valueWithPath('propstat.prop.displayname'));
            }

            cartridges.forEach(function (cartridge) {
              let arr = cartridge.split(path.sep);
              localCartridges.push(arr[arr.length - 1]);
            });

            let cartridgesOnServerLen = cartridgesOnServer.length;

            for (let i = 0; i < cartridgesOnServerLen; i++) {
              let currentServerCartridge = cartridgesOnServer[i],
                localCartridgesLen = localCartridges.length;

              for (let j = 0; j < localCartridgesLen; j++) {
                let currentLocalCartridge = localCartridges[j],
                  hasMatchedCartridges = (currentServerCartridge === currentLocalCartridge);

                if (hasMatchedCartridges) {
                  break;
                }
              }

              if (!hasMatchedCartridges) {
                differentCartridges.push(currentServerCartridge);
              }
            }

            return new Promise(function(resolve, reject) {
              if (differentCartridges.length > 0) {
                log.info(`\nThere are cartridges on the server that do not exist in your local cartridges: ${chalk.cyan(differentCartridges)}`);

                if (clearRemoteOnlyCartridges) {
                  log.info(`Deleting cartridges ${differentCartridges}`);
                  resolve(differentCartridges);
                } else {
                  reject(`Cartridges were not deleted`);
                }
              } else {
                reject(`\nThere is no defference between the cartridges on the server and your local cartridges`);
              }
            });
          }).then(function (res) {
            res.forEach(function (cartridge) {
              return webdav.delete(cartridge);
            });
          }).then(function () {
            log.info('Cartridges were deleted');
          }).catch(function(err) {
            log.info(err);
          });
    }

    insertBuildInfo () {

    }
  }

  module.exports = Davos;
}());
