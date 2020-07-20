'use strict';

/** Modules */
const Queue = require('sync-queue');
const chokidar = require('chokidar');
const md5File = require('md5-file');
const chalk = require('chalk');

/** Internal modules */
const Log = require('../logger');
const WebDav = require('../webdav');
const cartridgeHelper = require('../cartridge-helper');

function getCartridgesToWatch(config) {
    let cartridges = [];

    if (config.cartridge.length === 0) {
        const allCartridges = cartridgeHelper.getCartridges(true, config);
        cartridges = allCartridges.map(cartridge => `cartridges/${cartridge}`);
    } else {
        cartridges = config.cartridge.map(cartridge => `cartridges/${cartridge}`);
    }

    return cartridges;
}

function watch(config) {
    const queue = new Queue();
    const webdav = new WebDav(config);
    const allCartridges = getCartridgesToWatch(config); // config.cartridge.map(cartridge => `cartridges/${cartridge}`);
    const excludesWithDotFiles = config.exclude.concat([/[\/\\]\./]);
    const watchHashList = [];

    let isFirstUseFiles = true;
    let isFirstUseDirectories = true;
    let hash;

    const watcher = chokidar.watch(allCartridges, {
        ignored: excludesWithDotFiles,
        persistent: true,
        atomic: true,
        ignorePermissionErrors: true,
        awaitWriteFinish: {
            stabilityThreshold: 3000,
            pollInterval: 100
        }
    });

    Log.info('Waiting for initial scan completion');

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

                queue.place(() => {
                    /** Remove 'cartridges/' substring from path. */
                    const newPath = p.split('\\');
                    newPath.shift();
                    p = newPath.join('\\');

                    return webdav.put(p)
                        .then(() => {
                            Log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                            queue.next();
                        }, (err) => {
                            Log.error(err);
                            queue.next();
                        });
                });
            }
        })
        .on('addDir', p => {
            if (!isFirstUseDirectories) {
                Log.info(`Directory ${p} has been added`);

                queue.place(() => {
                    /** Remove 'cartridges/' substring from path. */
                    const newPath = p.split('\\');
                    newPath.shift();
                    p = newPath.join('\\');

                    return webdav.mkcol(p)
                        .then(() => {
                            Log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                            queue.next();
                        }, (err) => {
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

                queue.place(() => {
                    /** Remove 'cartridges/' substring from path. */
                    const newPath = p.split('\\');
                    newPath.shift();
                    p = newPath.join('\\');

                    return webdav.put(p)
                        .then(() => {
                            Log.info(chalk.cyan(`Successfully uploaded: ${p}`));
                            queue.next();
                        }, (err) => {
                            Log.debug(err);
                            queue.next();
                        });
                });
            }
        })
        .on('unlink', path => {
            const removedFile = watchHashList.find(x => x.filePath === path),
                indexOfRemovedFile = watchHashList.indexOf(removedFile);

            if (indexOfRemovedFile != -1) {
                watchHashList.splice(indexOfRemovedFile, 1);
            }

            Log.info(`File ${path} has been removed`);

            queue.place(() => {
                /** Remove 'cartridges/' substring from path. */
                const newPath = path.split('\\');
                newPath.shift();
                path = newPath.join('\\');

                return webdav.delete(path)
                    .then(() => {
                        Log.info(chalk.cyan(`Successfully deleted: ${path}`));
                        queue.next();
                    }, (err) => {
                        Log.error(err);
                        queue.next();
                    });
            });
        })
        .on('unlinkDir', path => {
            Log.info(`Directory ${path} has been removed`);

            queue.place(() => {
                /** Remove 'cartridges/' substring from path. */
                const newPath = path.split('\\');
                newPath.shift();
                path = newPath.join('\\');

                return webdav.delete(path)
                    .then(() => {
                        Log.info(chalk.cyan(`Successfully deleted: ${path}`));
                        queue.next();
                    }, (err) => {
                        Log.error(err);
                        queue.next();
                    });
            });
        })
        .on('error', (err) => {
            Log.error('Error while watching with chokidar:', err, '\nRestarting watch...');
        });
}

module.exports = watch;
