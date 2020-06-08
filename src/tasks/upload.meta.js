/** Modules */
const globby = require('globby');
const chalk = require('chalk');
const fs = require('fs');

/** Internal modules */
const BM = require('../bm');
const Log = require('../logger');
const utils = require('../util');
const Constants = require('../constants');

/**
 * Upload metadata for site
 * 
 * @params {object} object with params from gulp task
 */
function uploadMeta(config) {
    const pattern = config.Has('pattern') ? config.pattern : '*';
    const filename = "davos-meta-bundle.xml";
    const bm = new BM(config); // BM will be obsolete, use sfcc-ci module instead
    const currentRoot = utils.getCurrentRoot() + Constants.SITES_META_FOLDER + Constants.META_FOLDER;

    return new Promise((r, e) => {
        globby(currentRoot + "/" + pattern).then(files => {
            const xmlm = require("xmlappend");
            const filePath = configManager.getTempDir(config) + "/" + filename;

            Log.info(chalk.cyan(`Creating bundle from ${files.length} files.`));

            try {
                fs.writeFile(filePath, (xmlm(...files.map(file => {
                    return fs.readFileSync(file).toString();
                }))), function (err) {
                    err ? e(err) : r();
                });
            } catch (err) {
                e(err);
            }
        });
    }).then(function () {
        Log.info(chalk.cyan('Uploading file to impex.'));
        return bm.uploadMeta(filename);
    }).then(function () {
        Log.info(chalk.cyan('Login into BM.'));
        return bm.login();
    }).then(function () {
        Log.info(chalk.cyan('Validate XML'));
        return bm.validateMetaImport(filename);
    }).then(function () {
        Log.info(chalk.cyan('Check validation progress.'));
        return bm.checkImportProgress(filename, undefined, 'metaValidation');
    }).then(function () {
        Log.info(chalk.cyan('Initialize import sequence'));
        return bm.importMeta(filename);
    }).then(function () {
        Log.info(chalk.cyan('Check import progress.'));
        return bm.checkImportProgress(filename, undefined, 'metaImport');
    }).then(function () {
        return utils.delete(filename, 'Removing temporary file');
    }).then(function () {
        Log.info(chalk.cyan('Removing file from impex.'));
        return bm.deleteMeta(filename);
    }).catch(error => {
        Log.error(error.toString());
    });
}

module.exports = uploadMeta;
