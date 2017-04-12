(function () {
  'use strict';

  // Imports
  const fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    multimatch = require('multimatch'),
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

    upload () {
      const self = this;

      return new Promise(function (uploadResolve) { // arguments: uploadResolve, uploadReject
        config.validateConfigProperties(self.conf);

        let queue = new Queue(),
          webdav = new WebDav(self.conf),
          allCartridges = (self.conf.cartridge.constructor === Array) ? self.conf.cartridge : [self.conf.cartridge],
          processedCartridges = 0;

        allCartridges.forEach(function (cartridge) {
          let dirname = path.dirname(cartridge),
            cartridgeName = path.basename(cartridge),
            zipCartridgeName = cartridgeName + '.zip';

          queue.place(function () {
            return new Promise(function (resolve) { // arguments: resolve, reject
              let zipCartridge = new yazl.ZipFile(),
                walker = walk.walk(cartridge);

              walker.on('file', function (root, filestats, next) {
                let realPath = path.resolve(root, filestats.name),
                  metadataPath = path.relative(dirname, realPath);

                if (!multimatch([root, filestats.name], self.conf.exclude).length) {
                  zipCartridge.addFile(realPath, metadataPath);
                }

                next();
              });

              walker.on('end', function () {
                log.debug('Walking zipped files done for ' + cartridge);
                zipCartridge.end();
              });

              zipCartridge.outputStream
                .pipe(fs.createWriteStream(zipCartridgeName))
                .on('close', function () {
                  log.info('Zipping finished for ' + cartridge);
                  resolve(cartridgeName);
                });
            }).then(function () {
              return webdav.delete(cartridgeName);
            }).then(function () {
              return webdav.put(zipCartridgeName);
            }).then(function () {
              return webdav.unzip(zipCartridgeName);
            }).then(function () {
              return webdav.delete(zipCartridgeName);
            }).then(function () {
              log.info(chalk.cyan(`Uploaded cartridge: ${cartridge}`));
              return del(zipCartridgeName).then(function () {
                if (++processedCartridges == allCartridges.length) {
                  return uploadResolve();
                }

                queue.next();
              });
            }, function (err) {
              log.error(err);
              return del(zipCartridgeName).then(function () {
                if (++processedCartridges == allCartridges.length) {
                  return uploadResolve();
                }

                queue.next();
                return Promise.reject(err);
              });
            });
          });
        });
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
  }

  module.exports = Davos;
}());
