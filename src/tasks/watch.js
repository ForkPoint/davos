const Log = require('../logger');
const Queue = require('sync-queue');
const WebDav = require('../webdav');
const chokidar = require('chokidar');
const md5File = require('md5-file');
const chalk = require('chalk');

function watch(config) {
    const queue = new Queue();
    const webdav = new WebDav(config);
    const allCartridges = config.cartridge.map(cartridge => `cartridges/${cartridge}`);
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

module.exports = watch;
