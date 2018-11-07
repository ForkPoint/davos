(function () {
  'use strict';

  // Constants
  let CARTRIDGES_FOLDER = "/cartridges";
  const META_FOLDER = "/meta";

  // Imports
  const fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    globby = require('globby'),
    yazl = require('yazl'),
    del = require('del'),
    Queue = require('sync-queue'),
    chokidar = require('chokidar'),
    md5File = require('md5-file'),
    merger = require("./merger"),
    splitter = require("./splitter"),
    xmldoc = require('xmldoc');

  // Locals
  const ConfigManager = require('./config-manager'),
    WebDav = require('./webdav'),
    BM = require('./bm'),
    Log = require('./logger');

  class Davos {
    constructor(config, configManagerInstance) {
      config = config || {}
      if(configManagerInstance !== false) {
        this.ConfigManager = configManagerInstance || new ConfigManager();
        if(Object.keys(this.ConfigManager.loadConfiguration().profiles).length > 0){
            this.syncConfig(config);
        } else {
            if(Object.keys(config).length > 0){
                if(this.checkConsoleParamsForDetails(config)){
                    this.ConfigManager.profiles = [{'active': true, config: config}];
                    this.syncConfig(config);
                } else {
                    Log.error('No config file found. Pleace plovide BM details');
                }
            }
        }
      } else {
        this.config = config;
      }

        return this;
    }

    syncConfig(config) {
      this.config = (Object.keys(this.ConfigManager.config).length === 0)
        ? this.ConfigManager.loadConfiguration().getActiveProfile(config)
        : this.ConfigManager.mergeConfiguration(config);

      if (this.config && this.config.metaDir) {
        this.SITES_META_FOLDER = this.config.metaDir;
      } else {
        this.SITES_META_FOLDER = '/sites/site_template'
      }
    }


    /**
     * @var string archiveName
     * @var array arrayWithGlob example: ['*'] or ['meta*.xml', '**\/*.xml']
     */
    compress(root, archiveName, arrayWithGlob, rootPrefix) {
      const self = this;

      if (arrayWithGlob === undefined) {
        arrayWithGlob = ['**'];
      }

      if (rootPrefix === undefined) {
        rootPrefix = '';
      }

      return new Promise(function (compressResolve, compressReject) {
        let archive = new yazl.ZipFile();

        return globby(arrayWithGlob, {
          cwd: root,
          dot: true,
          nosort: true,
          absolute: true,
          ignore: self.config.exclude
        }).then((paths) => {
          paths.forEach(function (filePath) {
            let absolutePath = filePath,
              relativePath = rootPrefix + path.relative(root, absolutePath);
            if (fs.lstatSync(absolutePath).isDirectory()) {
              archive.addEmptyDirectory(relativePath);
            } else {
              archive.addFile(absolutePath, relativePath);
            }
          });
          archive.end();
          archive.outputStream
            .pipe(fs.createWriteStream(self.ConfigManager.getTempDir() + "/" + archiveName))
            .on('close', function () {
              Log.info(chalk.cyan('Archive created.'));
              compressResolve();
            });
        });
      });
    }

    delete(archiveName, logMessage = "Removing local archive.") {
      return del(this.ConfigManager.getTempDir() + "/" + archiveName).then(function () {
        Log.info(chalk.cyan(logMessage));
      });
    }

    getCartridgesPath() {
      return path.join(this.getCurrentRoot(), CARTRIDGES_FOLDER);
    }

    /**
     * Get cartridge names in an array.
     *
     * @param {bool} all whether to return all cartridges or only selected in config
     */
    getCartridges(all = false) {
      if (all || !this.config.cartridge) {
        let cartridgesDir = this.getCartridgesPath();

        return fs.readdirSync(cartridgesDir).filter(dir => {
          return fs.lstatSync(path.join(cartridgesDir, dir)).isDirectory();
        });
      } else {
        return this.config.cartridge;
      }
    }

    getCurrentRoot() {
      return this.config.basePath || process.cwd();
    }

	/**
	 * Upload cartridges
	 */
    uploadCartridges() {
      const self = this;

      let webdav = new WebDav(self.config, self.ConfigManager),
        archiveName = 'cartriges_' + self.config.codeVersion + '.zip',
        cartridges = self.getCartridges();

      Log.info(chalk.cyan(`Creating archive of ${cartridges.length} cartridges: ${cartridges.join(", ")}`));

      return self.compress(self.getCartridgesPath(), archiveName, cartridges.map(name => name + "/**")).then(function () {
        Log.info(chalk.cyan(`Uploading archive.`));
        return webdav.put(archiveName, {
          fromTmpDir: true
        });
      }).then(function () {
        Log.info(chalk.cyan(`Unzipping archive, code version: ${self.config.codeVersion}`));
        return webdav.unzip(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Removing archive.`));
        return webdav.delete(archiveName);
      }).then(function () {
        return self.delete(archiveName).then(function () {
          Log.info(chalk.cyan(`Cartriges uploaded.`));
        });
      }, function (err) {
        return self.delete(archiveName).then(function () {
          Log.info(chalk.red(`Error occurred.`));
          Log.error(err);
        });
      });
    }

	/**
	 * Upload sites metadata
	 * @param {array} arrayWithGlob
	 */
    uploadSitesMeta(arrayWithGlob) {
      const self = this;

      let webdav = new WebDav(self.config, self.ConfigManager),
        bm = new BM(self.config, self.ConfigManager),
        currentRoot = this.getCurrentRoot(),
        archiveName = 'sites_' + self.config.codeVersion + '.zip',
        rootPrefix = path.basename(archiveName, '.zip') + '/';

      currentRoot = currentRoot + this.SITES_META_FOLDER;

      if (arrayWithGlob === undefined) {
        arrayWithGlob = ['**/*.xml'];
      }

      return (function () {
        Log.info(chalk.cyan(`Creating archive of sites.`));
        return self.compress(currentRoot, archiveName, arrayWithGlob, rootPrefix);
      })().then(function () {
        Log.info(chalk.cyan(`Uploading archive.`));
        return bm.uploadSitesArchive(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Login into BM.`));
        return bm.login();
      }).then(function () {
        Log.info(chalk.cyan(`Ensure no import currently being processed.`));
        return bm.ensureNoImport(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Importing sites.`));
        return bm.importSites(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Check import progress.`));
        return bm.checkImportProgress(archiveName);
      }).then(function () {
        Log.info(chalk.cyan(`Removing archive.`));
        return bm.deleteSitesArchive(archiveName);
      }).then(function () {
        return self.delete(archiveName).then(function () {
          Log.info(chalk.cyan(`Site meta imported.`));
        });
      }, function (err) {
        return self.delete(archiveName).then(function () {
          Log.info(chalk.red(`Error occurred.`));
          Log.error(err);
        });
      });
    }

	/**
	 * Activate code version
	 */
    activateCodeVersion() {
      const self = this;

      let bm = new BM(self.config, self.ConfigManager);

      return (function () {
        Log.info(chalk.cyan(`Logging in to Business Manager.`));
        return bm.login();
      })().then(function () {
        Log.info(chalk.cyan(`Activating code version [${self.config.codeVersion}]`));
        return bm.activateCodeVersion();
      }, function (err) {
        Log.error(err);
        return Promise.reject(err);
      });
    }

	/**
	 * Watch files for changes
	 */
    watch() {
      const self = this;

      Log.info('Waiting for initial scan completion');

      let queue = new Queue(),
        webdav = new WebDav(self.config, self.ConfigManager),
        allCartridges = self.config.cartridge.map(cartridge => `cartridges/${cartridge}`),
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
              /** Remove 'cartridges/' substring from path. */
              let newPath = p.split('\\');
              newPath.shift();
              p = newPath.join('\\');

              return webdav.put(p)
                .then(function () {
                  Log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                  queue.next();
                }, function (err) {
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
              /** Remove 'cartridges/' substring from path. */
              let newPath = p.split('\\');
              newPath.shift();
              p = newPath.join('\\');

              return webdav.mkcol(p)
                .then(function () {
                  Log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                  queue.next();
                }, function (err) {
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
              /** Remove 'cartridges/' substring from path. */
              let newPath = p.split('\\');
              newPath.shift();
              p = newPath.join('\\');

              return webdav.put(p)
                .then(function () {
                  Log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                  queue.next();
                }, function (err) {
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
            /** Remove 'cartridges/' substring from path. */
            let newPath = path.split('\\');
            newPath.shift();
            path = newPath.join('\\');

            return webdav.delete(path)
              .then(function () {
                Log.info(chalk.cyan(`Successfully deleted: ${path}`));
                queue.next();
              }, function (err) {
                Log.error(err);
                queue.next();
              });
          });
        })
        .on('unlinkDir', path => {
          Log.info(`Directory ${path} has been removed`);

          queue.place(function () {
            /** Remove 'cartridges/' substring from path. */
            let newPath = path.split('\\');
            newPath.shift();
            path = newPath.join('\\');

            return webdav.delete(path)
              .then(function () {
                Log.info(chalk.cyan(`Successfully deleted: ${path}`));
                queue.next();
              }, function (err) {
                Log.error(err);
                queue.next();
              });
          });
        })
        .on('error', function (err) {
          Log.error('Error while watching with chokidar:', err, '\nRestarting watch...');
        });
    }

	/**
	 * Sinchronice server site files with local version
	 */
    sync() {
      const self = this;

      let webdav = new WebDav(self.config, self.ConfigManager),
        clearRemoteOnlyCartridges = (!self.config.delete) ? self.config.D : self.config.delete;

      if (clearRemoteOnlyCartridges === undefined) {
        clearRemoteOnlyCartridges = false;
      }

      webdav.propfind()
        .then(function (res) {
          let doc = new xmldoc.XmlDocument(res),
            responseNodes = doc.childrenNamed('response'),
            nodesLen = responseNodes.length,
            cartridges = self.config.cartridge,
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
            let currentServerCartridge = cartridgesOnServer[i];

              if (!localCartridges.includes(currentServerCartridge)) {
                differentCartridges.push(currentServerCartridge);
              }
          }

          return new Promise(function (resolve, reject) {
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
        }).catch(function (err) {
          Log.info(err);
        });
    }

    /**
     * Replace a placeholder in all files matching pattern with the current code version defined in davos.json.
     *
     * @param {string} pattern Starts from project root or cwd
     * @param {string} placeholder A string to look for
     */
    replaceRevisionNumber(pattern, placeholder = "@BUILD_NUMBER@") {
      const regex = new RegExp(placeholder, "g");

      return globby(this.getCurrentRoot() + "/" + pattern).then(files => {

        files.forEach(file => {
          let content = fs.readFileSync(file).toString();

          if (~content.search(placeholder)) {
            fs.writeFileSync(file, content.replace(regex, this.config.codeVersion));
          }

        })
      });
    }

    replaceTemplateInfo() {
      const self = this;

      return new Promise(function (replaceResolve, replaceReject) {
        if (!self.config.hasOwnProperty('templateReplace')) {
          Log.info(chalk.cyan('Skipping template replace.'));
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

      /**
       * Upload metadata for site
       * @params {object} object with params from gulp task
       */
      uploadMeta(params = null) {
          if (!this.config && params == null) {
              return false;
          }
          if (params) {
              if (!this.config) {
                if (this.checkConsoleParamsForDetails(params)) {
                    this.config = Object.assign({}, this.config, params);
                } else {
                    Log.error('No config file found. Pleace plovide BM details');
                    return false;
                }
              } else {
                this.config = Object.assign({}, this.config, params);
              }

          }

          let pattern;
          if (this.config.pattern) {
              pattern = this.config.pattern;
          }

      this.ConfigManager.mergeConfiguration(params);
      const self = this;
      const filename = "davos-meta-bundle.xml";

      if (pattern === undefined) {
        pattern = "*";
      }
      let bm = new BM(self.config, self.ConfigManager),
        currentRoot = this.getCurrentRoot();
      this.SITES_META_FOLDER === undefined ? this.SITES_META_FOLDER = '/sites/site_template' : '';
      currentRoot = currentRoot + this.SITES_META_FOLDER + META_FOLDER;

      return new Promise((r, e) => {
        globby(currentRoot + "/" + pattern).then(files => {
          Log.info(chalk.cyan("Creating bundle from " + files.length + " files."));

          const xmlm = require("xmlappend");

          fs.writeFile(this.ConfigManager.getTempDir() + "/" + filename, (xmlm(...files.map(file => {
            return fs.readFileSync(file).toString();
          }))), function (err) {
            err ? e(err) : r();
          });
        });
      }).then(function () {
        Log.info(chalk.cyan("Uploading file to impex."));
        return bm.uploadMeta(filename);
      }).then(function () {
        Log.info(chalk.cyan(`Login into BM.`));
        return bm.login();
      }).then(function () {
        Log.info(chalk.cyan(`Validate XML`));
        return bm.validateMetaImport(filename);
      }).then(function () {
        Log.info(chalk.cyan(`Check validation progress.`));
        return bm.checkImportProgress(filename, undefined, "metaValidation");
      }).then(function () {
        Log.info(chalk.cyan(`Initialize import sequence`));
        return bm.importMeta(filename);
      }).then(function () {
        Log.info(chalk.cyan(`Check import progress.`));
        return bm.checkImportProgress(filename, undefined, "metaImport");
      }).then(function () {
        return self.delete(filename, "Removing temporary file");
      }).then(function () {
        Log.info(chalk.cyan(`Removing file from impex.`));
        return bm.deleteMeta(filename);
      }).catch(error => {
        Log.error(error.toString());
      });
    }

    /**
     * SPLIT META
     */
    split(paramIn = null, paramOut = null, force = null) {

      if (paramIn !== null && paramOut !== null){
		  if (this.config == undefined){
			this.config = {};
		  }

		this.config.command = {in: paramIn, out: paramOut};
        if (force == '--force') {
          this.config.command.force = true;
        }
      } else {
          if(this.checkForParametersInConfig(this.config.command, 'in', 'out') === false){
            return false;
          }
	  }

      const bundle = path.join(this.getCurrentRoot(),this.config.command.in);
      const out =  path.join(this.getCurrentRoot(),this.config.command.out);
	  const bundleWithOutFile = bundle.substring(0, bundle.lastIndexOf(path.sep));

      if (this.checkPath(bundleWithOutFile, out) === false){
        return false;
	  }
	  //return bundle;
      return splitter.split(this, bundle, out);
    }

    /**
     * Merge a bunch of xml files with the same root element into a bundle.
     */
    merge(paramIn = null, paramOut = null, force = null) {
      if(paramIn !== null && paramOut !== null){
          if (this.config == undefined) {
              this.config = {};
          }
          this.config.command = { in: paramIn, out: paramOut };
          if (force !== null && force == '--force') {
              this.config.command.force = true;
          }
      } else {
          if(this.checkForParametersInConfig(this.config.command, 'in', 'out') === false){
            return false;
          }
      }

      const pattern = path.join(this.getCurrentRoot(), this.config.command.in);
      const out = this.config.command.out;
      const outPath = path.join(this.getCurrentRoot(), out);
      const outWithoutFile = outPath.substring(0, outPath.lastIndexOf(path.sep));
      let dir;
        if (this.checkPath(pattern, outWithoutFile) === false) {
        return false;
      }
      return new Promise((r, e) => {
        globby(pattern).then(files => {
          if (!files.length) {
            return r();
          }

          dir = path.dirname(files[0]);

          merger.merge(this, files).then(result => {
            fs.writeFile(out || (dir + "/bundle.xml"), result, function (err) {
              err ? e(err) : r();
            });
          }).catch(e);
        });
      })
    }
    checkForParametersInConfig(config, ...params){
      for (let c = 0; c < params.length; c++){
        if(!(params[c] in config) || config[params[c]] === undefined || config[params[c]].length == 0){
            Log.error(`No paramenter added! Please provide ${params[c]} parameter.`);
            return false;
        }
      }
    }

    checkPath(...params) {
      const fs = require('fs');
      for (let c = 0; c < params.length; c++) {
        if (!fs.existsSync(params[c])) {
            if (this.config.command.force !== undefined && this.config.command.force === true) {
                fs.mkdirSync(params[c]);
            } else {
                Log.error("Folder does not exist. Use --force to create it");
                return false;
            }
        }
      }
    }

    checkConsoleParamsForDetails(config) {
      const reqiuredParams = ['hostname', 'username', 'password', 'codeVersion'];
      let cnt = 0
      for (let p = 0; p < reqiuredParams.length; p++) {
        if (!config.hasOwnProperty(reqiuredParams[p])) {
          Log.error(`Param ${reqiuredParams[p]} are not provided. Please use --${reqiuredParams[p]} "value" to add`);
          cnt++;
        } else if (config[reqiuredParams[p]] == '') {
          Log.error(`Param ${reqiuredParams[p]} are empty`);
          cnt++;
        }
      }

      return cnt > 0 ? false : true;
    }


  }

  module.exports = Davos;
}());
