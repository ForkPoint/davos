(function () {
  'use strict';

  // Constants
  const ROOT_DIR = '.',
    ARCHIVE_NAME = 'cartridges.zip',
    ARCHIVE_NAME_META = 'sitemeta.zip'

  // Imports
  const fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    walk = require('walk'), // @todo remove from requirements
    globby = require('globby'),
    yazl = require('yazl'),
    del = require('del'),
    Queue = require('sync-queue'),
    chokidar = require('chokidar'),
    md5File = require('md5-file'),
    xmldoc = require('xmldoc');

  // Locals
  const ConfigManager = require('./config-manager'),
    WebDav = require('./webdav'),
    Log = require('./logger');

  class Davos {
    constructor (config, ConfigManagerInstance) {
      this.ConfigManager = ConfigManagerInstance || new ConfigManager();
      this.config = (Object.keys(this.ConfigManager.config).length === 0)
        ? this.ConfigManager.loadConfiguration().getActiveProfile(config)
        : this.ConfigManager.mergeConfiguration(config);
      return this;
    }

    deleteCartridges () {
      const self = this;

      return new Promise(function (resolve, reject) {
        let queue = new Queue(),
          webdav = new WebDav(self.config, self.ConfigManager),
          cartridges = self.config.cartridge;

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

    compressCartridges (archiveName) {
      const self = this;

      return new Promise(function (compressResolve, compressReject) {
        let archive = new yazl.ZipFile(),
          srcPath = path.resolve(ROOT_DIR),
          cartridges = self.config.cartridge;

        if (cartridges.length < 1) {
          compressReject();
          return;
        }

        walk.walkSync(srcPath, {
          filters: self.ConfigManager.getIgnoredPaths(),
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

              if (self.ConfigManager.isValidCartridgePath(relativePath, cartridges)) {
                archive.addEmptyDirectory(relativePath);
              }

              next();
            },
            file: function (root, fileStats, next) {
              let absolutePath = path.resolve(root, fileStats.name),
                relativePath = path.relative(srcPath, absolutePath);

              if (self.ConfigManager.isValidCartridgePath(relativePath, cartridges)) {
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
            Log.info(chalk.cyan('Archive created.'));
            compressResolve();
          });

      });
    }

    // arrayWithGlob example: ['meta*.xml', 'sites/**/*.xml']
    compressMeta (arrayWithGlob) {
      const self = this;

      return new Promise(function (compressMetaResolve, compressMetaReject) {
        let archive = new yazl.ZipFile(),
          archiveName = 'sites_' + self.config.codeVersion + '.zip';

        return globby(arrayWithGlob, {
          cwd: self.config.basePath || process.cwd(),
          dot: true,
          nosort: true,
          absolute: true,
          ignore: self.config.exclude
        }).then((paths) => {
          paths.forEach(function (filePath) {
            let absolutePath = filePath,
              relativePath = path.relative(ROOT_DIR, absolutePath);

            archive.addFile(absolutePath, relativePath);
          });
          archive.end();
          archive.outputStream
            .pipe(fs.createWriteStream(archiveName))
            .on('close', function () {
              Log.info(chalk.cyan('Archive with sites data created.'));
              compressMetaResolve();
            });
        });
      });
    }

    uploadCartridges () {
      const self = this;

      let webdav = new WebDav(self.config, self.ConfigManager),
        archiveName = path.join(ROOT_DIR, ARCHIVE_NAME);

      return (function () {
        Log.info(chalk.cyan(`Creating archive of all cartridges.`));
        return self.compressCartridges(archiveName);
      })().then(function () {
        Log.info(chalk.cyan(`Uploading archive.`));
        return webdav.put(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Unzipping archive.`));
        return webdav.unzip(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Removing archive.`));
        return webdav.delete(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Cartriges uploaded.`));
        return del(archiveName).then(function () {});
      }, function (err) {
        Log.error(err);
        return del(archiveName).then(function () {});
      });
    }

    uploadMeta () {
      const self = this;

      let webdav = new WebDav(self.config, self.ConfigManager),
        archiveName = path.join(ROOT_DIR, ARCHIVE_NAME_META);
      return (function () {
        Log.info(chalk.cyan(`Creating archive of all cartridges.`));
        return self.compressMeta(archiveName);
      })().then(function () {
        Log.info(chalk.cyan(`Uploading archive.`));
        return webdav.put(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Unzipping archive.`));
        return webdav.unzip(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Removing archive.`));
        return webdav.delete(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Site meta uploaded.`));
        return del(archiveName).then(function () {});
      }, function (err) {
        Log.error(err);
        return del(archiveName).then(function () {});
      });
    }

    activateCodeVersion () {
      const self = this;

      let webdav = new WebDav(self.config, self.ConfigManager);

      return (function () {
        Log.info(chalk.cyan(`Logging in to Business Manager.`));
        return webdav.bmLogin();
      })().then(function () {
        Log.info(chalk.cyan(`Activating code version.`));
        return webdav.activateCodeVersion();
      }, function (err) {
        Log.error(err);
        return Promise.reject(err);
      });
    }

    watch () {
      const self = this;

      Log.info('Waiting for initial scan completion');

      let queue = new Queue(),
        webdav = new WebDav(self.config, self.ConfigManager),
        allCartridges = self.config.cartridge,
        excludesWithDotFiles = self.config.exclude.concat([/[\/\\]\./]),
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
            Log.info('Initial scan complete. Ready for changes');
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
              Log.info(`File ${p} has been added`);

              queue.place(function () {
                return webdav.put(p)
                  .then(function () {
                    Log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                    queue.next();
                  }, function(err) {
                    Log.error(err);
                    queue.next();
                  });
              });
            }
          })
          .on('addDir', p => {
            if (!isFirstUseDirectories) {
              Log.info(`Directory ${p} has been added`);

              queue.place(function () {
                return webdav.mkcol(p)
                  .then(function () {
                    Log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                    queue.next();
                  }, function(err) {
                    Log.error(err);
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
              Log.info(`File ${p} has been changed`);
              queue.place(function () {
                return webdav.put(p)
                  .then(function () {
                    Log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                    queue.next();
                  }, function(err) {
                    Log.debug(err);
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

            Log.info(`File ${path} has been removed`);

            queue.place(function () {
              return webdav.delete(path)
                .then(function() {
                  Log.info(chalk.cyan(`Successfully deleted: ${path}`));
                  queue.next();
                }, function(err) {
                  Log.error(err);
                  queue.next();
                });
            });
          })
          .on('unlinkDir', path => {
            Log.info(`Directory ${path} has been removed`);

            queue.place(function () {
              return webdav.delete(path)
                .then(function () {
                  Log.info(chalk.cyan(`Successfully deleted: ${path}`));
                  queue.next();
                }, function(err) {
                  Log.error(err);
                  queue.next();
                });
            });
          })
          .on('error', function(err) {
            Log.error('Error while watching with chokidar:', err, '\nRestarting watch...');
          });
    }

    sync () {
      const self = this;

      let webdav = new WebDav(self.config, self.ConfigManager),
        clearRemoteOnlyCartridges = (!self.config.delete) ? self.config.D : self.config.delete;

      if (clearRemoteOnlyCartridges === undefined) {
        clearRemoteOnlyCartridges = false;
      }

      webdav.propfind()
          .then(function(res) {
            let doc = new xmldoc.XmlDocument(res),
              responseNodes = doc.childrenNamed('response'),
              nodesLen = responseNodes.length,
              workingDirectory = self.config.basePath || process.cwd(),
              cartridges = self.ConfigManager.getCartridges(workingDirectory),
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
                Log.info(`\nThere are cartridges on the server that do not exist in your local cartridges: ${chalk.cyan(differentCartridges)}`);

                if (clearRemoteOnlyCartridges) {
                  Log.info(`Deleting cartridges ${differentCartridges}`);
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
            Log.info('Cartridges were deleted');
          }).catch(function(err) {
            Log.info(err);
          });
    }

    replaceTemplateInfo () {
      const self = this;

      return new Promise(function (replaceResolve, replaceReject) {
        if (!self.config.hasOwnProperty('templateReplace')) {
          Log.info(chalk.cyan('Skipping template replace.'));
          Log.warn(`Your configuration profile does not contain optional property templateReplace`);
          return replaceResolve();
        }

        let queue = new Queue(),
          webdav = new WebDav(self.config, self.ConfigManager);

        self.config.templateReplace.files.forEach(function (templateFile) {
          queue.place(function () {
            return (function () {
              return webdav.getContent(templateFile);
            })().then(function (fileContent) {
              let patterns = self.config.templateReplace.pattern;

              Object.keys(patterns).forEach(function (key) {
                let regexp = new RegExp(patterns[key], 'g'),
                  value = '';

                switch (key) {
                  case 'buildVersion': {
                    // @TODO get value from config
                    value = key;
                    break;
                  }
                }

                fileContent = fileContent.replace(regexp, value);
              });

              return Promise.resolve(fileContent);
            }).then(function (fileContent) {
              return webdav.putContent(templateFile, fileContent);
            }).then(function () {
              queue.next();
            }, function (err) {
              queue.next();
            });
          });
        });

        return replaceResolve();
      });
    }
  }

  module.exports = Davos;
}());
