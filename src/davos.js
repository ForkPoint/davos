/*jshint esversion: 6 */
(function() {
    'use strict';
    //own dependencies
    const config = require('./config'),
        WebDav = require('./webdav'),
        log = require('./logger');

    const fs = require('fs'),
        prompt = require('prompt'),
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

    let createInsertEdit = [{
            name: 'hostname',
            description: 'Hostname of your Sandbox (without https:// prefix)',
            required: true
        }, {
            name: 'username',
            description: 'Username of your Sandbox',
            required: true
        }, {
            name: 'password',
            hidden: true,
            description: 'Password of your Sandbox (the input won\'t be visible)',
            required: true
        }, {
            name: 'codeversion',
            description: 'Code Version (default is version1)',
            default: 'version1'
        }, {
            name: 'exclude',
            description: 'Exclude uploading folders and files. Separate all excludes by space',
            default: '**/node_modules/**'
        }],
        yesOrNO = [{
            name: 'answer',
            description: 'Would you like to delete them',
            required: true,
            pattern: /^(?:y\b|n\b|yes\b|no\b)/i,
            default: 'n'
        }];

    module.exports = (conf) => {
        let command = conf._[0],
            webdav,
            excludes = conf.exclude;

        if (command === 'upload' || command === 'watch' || command === 'sync') {
            webdav = new WebDav(conf);
        }

       	let workingDirectory = conf.basePath || process.cwd();

       	log.debug('Base folder is ' + workingDirectory);

        let createConfig = () => {
            let cartridges = config.getCartridges(workingDirectory, []);
            if (cartridges.length > 0) {
                if (config.isConfigExisting()) {
                    log.info(chalk.yellow('\nConfiguration already exists'));
                } else {
                    prompt.start();

                    prompt.get(createInsertEdit, function(err, result) {
                        if (err) {
                            return config.promptError(err);
                        }


                        let excludes = result.exclude.split(' '),
                            configJSON = [{
                                active: true,
                                profile: result.hostname.split('-')[0],
                                config: {
                                    hostname: result.hostname,
                                    username: result.username,
                                    password: result.password,
                                    cartridge: cartridges,
                                    codeVersion: result.codeversion,
                                    exclude: excludes
                                }
                            }];
                        config.saveConfiguration(configJSON);
                        process.exit();
                    });
                }
            } else {
                log.info(chalk.yellow(`No cartridges found in ${workingDirectory} and it's subdirectories`));
            }
        };

        let insertProfile = () => {
            prompt.start();
            prompt.get(createInsertEdit, function(err, result) {
                if (err) {
                    return config.promptError(err);
                }
                let cartridges = config.getCartridges(workingDirectory, []);
                let i,
                    currentProfile,
                    excludes = result.exclude.split(' '),
                    profileJSON = {
                        active: false,
                        profile: result.hostname.split('-')[0],
                        config: {
                            hostname: result.hostname,
                            username: result.username,
                            password: result.password,
                            cartridge: cartridges,
                            codeVersion: result.codeversion,
                            exclude: excludes
                        }
                    },
                    configJSON = config.loadConfiguration(),
                    newProfile = result.hostname.split('-')[0],
                    isProfileExisting = false,
                    len = configJSON.length;

                for (i = 0; i < len; i += 1) {
                    currentProfile = configJSON[i];
                    if (currentProfile.profile === newProfile) {
                        isProfileExisting = true;
                    }
                }
                if (isProfileExisting) {
                    log.info(chalk.yellow(`\n${newProfile} exists in your current configuration`));
                } else {
                    configJSON.push(profileJSON);
                    config.saveConfiguration(configJSON);
                    log.info(chalk.cyan(`\n${newProfile} inserted successfuly.`));
                }

            });
        };

        let listProfiles = () => {
            let list = config.loadConfiguration(),
                i,
                currentProfile,
                result,
                activeProfile = list.find(x => x.active === true),
                len = list.length;
            for (i = 0; i < len; i += 1) {
                currentProfile = list[i];
                result = chalk.bgWhite(chalk.black(currentProfile.profile));
                if (currentProfile === activeProfile) {
                    result += chalk.cyan(' <--- active');
                }
                log.info(`\n${result}`);
            }
        };

        let editProfile = () => {
            let profile = (!conf.profile) ? conf.P : conf.profile;
            if (!profile || profile === true) {
                let message = (profile === undefined) ? '\nUse edit --profile or -P [profile name]' : '\nPlease specify a profile';
                log.info(chalk.yellow(message));
                return;
            }

            let list = config.loadConfiguration();

            let i,
                currentProfile,
                newList = [],
                len = list.length,
                foundProfile = list.find(x => x.profile === profile);
            if (foundProfile) {
                prompt.start();
                prompt.get(createInsertEdit, function(err, result) {
                    if (err) {
                        return config.promptError(err);
                    }
                    let cartridges = config.getCartridges(workingDirectory, []);
                    let excludes = result.exclude.split(' '),
                        newConfig = {
                            hostname: result.hostname,
                            username: result.username,
                            password: result.password,
                            cartridge: cartridges,
                            codeVersion: result.codeversion,
                            exclude: excludes
                        };
                    for (i = 0; i < len; i += 1) {
                        currentProfile = list[i];
                        currentProfile.active = currentProfile.active;
                        currentProfile.profile = (currentProfile === foundProfile) ? result.hostname.split('-')[0] : currentProfile.profile;
                        currentProfile.config = (currentProfile === foundProfile) ? newConfig : currentProfile.config;
                        newList.push(currentProfile);
                    }
                    config.saveConfiguration(newList);
                    log.info(chalk.cyan(`\nSuccessfuly updated profile ${profile}`));
                });
            } else {
                log.info(chalk.red(`\nCannot find ${profile} profile`));
                return;
            }
        };

        let switchProfile = () => {
            let profile = (!conf.profile) ? conf.P : conf.profile;
            if (!profile || profile === true) {
                let message = (profile === undefined) ? '\nUse switch --profile or -P [profile name]' : '\nPlease specify a profile';
                log.info(chalk.yellow(message));
                return;
            }

            let list = JSON.parse(fs.readFileSync('upload.json', 'UTF-8')),
                i,
                currentProfile,
                newList = [],
                len = list.length,
                foundProfile = list.find(x => x.profile === profile);
            if (foundProfile) {
                for (i = 0; i < len; i += 1) {
                    currentProfile = list[i];
                    currentProfile.active = (currentProfile === foundProfile) ? true : false;
                    newList.push(currentProfile);
                }
                fs.writeFileSync('upload.json', JSON.stringify(newList));
                log.info(chalk.cyan(`\nSwitched to ${foundProfile.profile}. It is now your active profile`));
            } else {
                log.info(chalk.red(`\nCannot find ${profile} profile`));
                return;
            }
        };

        let syncCartridges = () => {
            webdav.propfind()
                .then(function(res) {
                    let cartridges = config.getCartridges(workingDirectory, []);
                    let i,
                        j,
                        localCartridgesLen,
                        cartridgesOnServerLen,
                        hasMatchedCartridges = false,
                        list = config.loadConfiguration(),
                        foundProfile = list.find(x => x.active === true),
                        doc = new xmldoc.XmlDocument(res),
                        responseNodes = doc.childrenNamed('response'),
                        nodesLen = responseNodes.length,
                        cartridgesOnServer = [],
                        localCartridges = [],
                        differentCartridges = [];
                    foundProfile.config.cartridge = cartridges.slice();

                    config.saveConfiguration(list);

                    for (i = 0; i < nodesLen; i += 1) {
                        if (i === 0) {
                            continue;
                        }
                        cartridgesOnServer.push(responseNodes[i].valueWithPath('propstat.prop.displayname'));
                    }
                    cartridges.forEach(function(cartridge) {
                        let arr = cartridge.split('\\');
                        localCartridges.push(arr[arr.length - 1]);
                    });

                    for(i = 0, cartridgesOnServerLen = cartridgesOnServer.length; i < cartridgesOnServerLen; i += 1){
                        let currentServerCartridge = cartridgesOnServer[i];
                        for (j = 0, localCartridgesLen = localCartridges.length; j < localCartridgesLen; j += 1) {
                            let currentLocalCartridge = localCartridges[j];
                            if (currentServerCartridge === currentLocalCartridge) {
                                hasMatchedCartridges = true;
                                break;
                            } else {
                                hasMatchedCartridges = false;
                            }
                        }
                        if (!hasMatchedCartridges) {
                            differentCartridges.push(currentServerCartridge);
                        }
                    }
                    return new Promise(function(resolve, reject) {
                        if (differentCartridges.length > 0) {
                            log.info(`\nThere are cartridges on the server that do not exist in your local cartridges: ${chalk.cyan(differentCartridges)}`);
                            prompt.start();

                            prompt.get(yesOrNO, function(err, result) {
                                if (err) {
                                    return config.promptError(err);
                                }
                                let answer = result.answer.toLowerCase();
                                switch (answer) {
                                    case 'y':
                                    case 'yes':
                                        log.info(`Deleting cartridges ${differentCartridges}`);
                                        resolve(differentCartridges);
                                        break;
                                    case 'n':
                                    case 'no':
                                        reject(`OK`);
                                        break;
                                    default:
                                        reject('OK');
                                }
                            });

                        } else {
                            reject(`\nThere is no defference between the cartridges on the server and your local cartridges`);
                        }
                    });
                }).then(function(res) {
                    res.forEach(function(cartridge) {
                        return webdav.delete(cartridge);
                    });
                }).then(function() {
                    log.info('deleted');
                }).catch(function(err) {
                    log.info(err);
                });
        };

        let uploadCartridges = () => {
            let queue = new Queue(),
                allCartridges = (conf.cartridge.constructor === Array) ? conf.cartridge : [conf.cartridge];
            allCartridges.forEach(function(cartridge) {
                let dirname = path.dirname(cartridge),
                    cartridgeName = path.basename(cartridge),
                    zipCartridgeName = cartridgeName + '.zip';

                queue.place(function() {
                    return new Promise(function(resolve, reject) {
                        let walker = walk.walk(cartridge),
                            zipCartridge = new yazl.ZipFile();
                        walker.on('file', function(root, filestats, next) {
                            let realPath = path.resolve(root, filestats.name),
                                metadataPath = path.relative(dirname, realPath);
                            if (!multimatch([root, filestats.name], excludes).length) {
                                zipCartridge.addFile(realPath, metadataPath);
                            }
                            next();
                        });
                        walker.on('end', function() {
                        	log.debug('Walking zipped files done for ' + cartridge);
                            zipCartridge.end();
                        });
                        zipCartridge.outputStream
                            .pipe(fs.createWriteStream(zipCartridgeName))
                            .on('close', function() {
                            	log.info('Zipping finished for ' + cartridge);
                                resolve(cartridgeName);
                            });
                    }).then(function() {
                        return webdav.delete(cartridgeName);
                    }).then(function() {
                        return webdav.put(zipCartridgeName);
                    }).then(function() {
                        return webdav.unzip(zipCartridgeName);
                    }).then(function() {
                        return webdav.delete(zipCartridgeName);
                    }).then(function() {
                        log.info(chalk.cyan(`Uploaded cartridge: ${cartridge}`));
                        return del(zipCartridgeName)
                            .then(function() {
                                queue.next();
                            });
                    }, function(err) {
                        log.error(err);
                        return del(zipCartridgeName)
                            .then(function() {
                                queue.next();
                                return Promise.reject(err);
                            });
                    });
                });
            });
        };

        let watchCartridges = (cartridges) => {
            log.info('Waiting for initial scan completion');
            var excludesWithDotFiles = excludes.concat([/[\/\\]\./]);
            let hash,
                queue = new Queue(),
                watchHashList = [],
                isFirstUseFiles = true,
                isFirstUseDirectories = true,

                watcher = chokidar.watch(cartridges, {
                    ignored: excludesWithDotFiles,
                    persistent: true,
                    atomic: true,
                    ignorePermissionErrors: true,
                    awaitWriteFinish: {
                        stabilityThreshold: 3000,
                        pollInterval: 100
                    },
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
                        queue.place(function() {
                            return webdav.put(p)
                                .then(function() {
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
                        queue.place(function() {
                            return webdav.mkcol(p)
                                .then(function() {
                                    log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                                    queue.next();
                                }, function(err) {
                                    log.error(err);
                                    queue.next();
                                });
                        });
                    }
                })
                .on('change', (p, stats) => {
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
                        queue.place(function() {
                                return webdav.put(p)
                                .then(function() {
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
                    queue.place(function() {
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
                    queue.place(function() {
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
                .on('error', function(err) {
                    log.error('Error while watching with chokidar:',
                        err, '\nRestarting watch...');
                });
        };
        if (conf.verbose) {
            log.info(chalk.blue(conf));
        } else {
            switch (command) {
                case 'create':
                    createConfig();
                    break;
                case 'insert':
                    insertProfile();
                    break;
                case 'list':
                    listProfiles();
                    break;
                case 'edit':
                    editProfile();
                    break;
                case 'switch':
                    switchProfile();
                    break;
                case 'upload':
                    uploadCartridges();
                    break;
                case 'watch':
                    let cw = conf.cartridge;
                    if (cw.constructor !== Array) {
                        cw = [cw];
                    }
                    watchCartridges(cw);
                    break;
                case 'sync':
                    syncCartridges();
                    break;
                case undefined:
                    log.info(require('yargs').getUsageInstance().help());
                    break;
                default:
                    log.info(chalk.red(`\nCommand ${command} doesn't exist`));
            }
        }
    };
}());
