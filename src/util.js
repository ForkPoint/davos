'use strict';

/** Modules */
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const yazl = require('yazl');
const globby = require('globby');
const del = require('del');

/** Internal Modules */
const Log = require('./logger');
const Constants = require('./constants');

// used to be just 'delete'
function deleteArchive(archiveName, logMessage, config) {
    const defaultMsg = 'Removing local archive.';
    return del(`${getTempDir(config)  }/${  archiveName}`).then(() => {
        Log.info(chalk.cyan(logMessage || defaultMsg));
    });
}

function deleteFiles(folder){
    const files = fs.readdirSync(folder);

    if (files.length > 0) {
        let res = null;
        for (let c = 0; c < files.length; c++) {
            const filePath = `${folder + path.sep + files[c]  }ss`;
            fs.stat(filePath, (err, stats) => {

                if (err) {
                    res = false
                    Log.error('err.message')
                    return false;
                }


                fs.unlink(filePath, (err) => {
                    if (err) {
                        Log.error(err.message);
                        return false;
                    }
                });
            });
        }
        return res;
    }
}

function gitLogDiff(config){
    const {exec} = require('child_process');
    const gitLogDifference = `git diff --name-only ${config.git.start} ${config.git.end} --diff-filter=AM -- sites/site_template`;
    const root = getCurrentRoot();
    const tempDir = getTempDir(config);

    if (!config.git.start || !config.git.end) {
        Log.error('Please provide --start "Tag1" --end "Tag2" parameters!');
        return false;
    }

    require('del').sync(`${root + path.sep + tempDir + path.sep  }*`);

    exec(gitLogDifference, (err, stdout, stderr) => {
        const changedFiles = stdout.split(/\r|\n/).filter(Boolean);

        if (err) return false;

        if (changedFiles.length) {
            const mkdirp = require('mkdirp');

            for (let c = 0; c < changedFiles.length; c++) {
                const changedFile = changedFiles[c]
                const pathToFile = tempDir + path.sep + config.git.end + changedFile.replace('sites/site_template', '').replace(path.basename(changedFile), '');

                mkdirp(pathToFile, (err) => {
                    if (err) console.error(err);

                    fs.copyFile(changedFile, pathToFile + path.basename(changedFile), (err) => {
                        if (err) throw err;
                    });
                });
            }

            Log.info('Changed file are copped in temp dir');
        } else {
            Log.info('There are not changes');
        }
    });
}

/**
 * @var string archiveName
 * @var array arrayWithGlob example: ['*'] or ['meta*.xml', '**\/*.xml']
 */
function compress(root, archiveName, arrayWithGlob, rootPrefix, config) {
    if (arrayWithGlob === undefined) arrayWithGlob = ['**'];
    if (rootPrefix === undefined) rootPrefix = '';

    return new Promise(((compressResolve, compressReject) => {
        const archive = new yazl.ZipFile();
        const tempDir = getTempDir(config);

        return globby(arrayWithGlob, {
            cwd: root,
            dot: true,
            nosort: true,
            absolute: true,
            ignore: config.exclude
        }).then((paths) => {
            paths.forEach((filePath) => {
                const absolutePath = filePath,
                    relativePath = rootPrefix + path.relative(root, absolutePath);
                if (fs.lstatSync(absolutePath).isDirectory()) {
                    archive.addEmptyDirectory(relativePath);
                } else {
                    archive.addFile(absolutePath, relativePath);
                }
            });
            archive.end();
            archive.outputStream
                .pipe(fs.createWriteStream(`${tempDir  }/${  archiveName}`))
                .on('close', () => {
                    Log.info(chalk.cyan('Archive created.'));
                    compressResolve();
                });
        }).catch((err) => { });
    }));
}

function getCurrentRoot() {
    return process.cwd();
}

/** Necessary? */
// function checkForParametersInConfig(config, ...params) {
//     for (let c = 0; c < params.length; c++) {
//         if (!(params[c] in config) || config[params[c]] === undefined || config[params[c]].length == 0) {
//             Log.error(`No paramenter added! Please provide ${params[c]} parameter.`);
//             return false;
//         }
//     }
// }

function getTempDir(config) {
    const dir = config.Has('tmpDir') ? config.tmpDir : Constants.TMP_DIR;

    try {
        fs.mkdirSync(dir);
    } catch (e) {

    }

    return dir;
}

function promptError(e) {
    Log.error(e);
    return 1;
}

function replaceTemplateInfo(config) {
    return new Promise(((replaceResolve, replaceReject) => {
        if (!config.Has('templateReplace')) {
            Log.info(chalk.cyan('Skipping template replace.'));
            return replaceResolve();
        }

        const queue = new Queue();
        // replace webdav wilth SFCC-CI module
        const webdav = new WebDav(config);

        config.templateReplace.files.forEach((templateFile) => {
            queue.place(() => {
                return (function () {
                    return webdav.getContent(templateFile);
                })().then((fileContent) => {
                    const patterns = config.templateReplace.pattern;

                    Object.keys(patterns).forEach((key) => {
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
                }).then((fileContent) => {
                    return webdav.putContent(templateFile, fileContent);
                }).then(() => {
                    queue.next();
                }, (err) => {
                    queue.next();
                });
            });
        });

        return replaceResolve();
    }));
}

function checkPath(config, ...params) {
    let result = false;

    for (let c = 0; c < params.length; c++) {
        let dirExists;
        const dir = params[c];

        try {
            dirExists = fs.existsSync(dir);
        } catch (e) { }

        if (!dirExists) {
            // why should a --force command be used to create directory?
            // should the directory just be created if it doesn't exist?
            if (config.command.force) {
                fs.mkdirSync(dir, { recursive: true });
                result = true;
            } else {
                Log.error('Folder ' + dir + ' does not exist. Use --force if you want to create it');
                return false;
            }
        } else {
            result = true;
        }
    }

    return result;
}

/** Necessary? */
/** TODO */
function checkConsoleParamsForDetails(config) {
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

function listCodeVersions(versions) {
    versions.forEach((codeVer) => {
        if (codeVer.active) {
            Log.info(chalk.bgGreen(` ID: ${codeVer.id} `));
        } else {
            Log.info(`ID: ${codeVer.id}`);
        }
    });
}

function getTemplate(templateName) {
    const root = getCurrentRoot();
    const template = fs.readFileSync(`${root}/${Constants.RESOURCES_FOLDER}/${templateName}.template`);

    return template.toString();
}

module.exports = {
    deleteFiles,
    gitLogDiff,
    deleteArchive,
    compress,
    getCurrentRoot,
    // checkForParametersInConfig: checkForParametersInConfig,
    getTempDir,
    promptError,
    replaceTemplateInfo,
    checkPath,
    checkConsoleParamsForDetails,
    listCodeVersions,
    getTemplate,
};
