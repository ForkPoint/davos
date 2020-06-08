/** Modules */
const path = require('path');
const chalk = require('chalk');

/** Internal modules */
const Log = require('../logger');
const BM = require('../bm');
const utils = require('../util');
const Constants = require('../constants');

function uploadSitesMeta(arrayWithGlob, config) {
    if (!config.Has('exclude')) config.SetProperty('exclude', ["**/node_modules/**", "**/.git/**", "**/.svn/**", "**/.sass-cache/**"]);

    // BM wil be obsolete, please use sfcc-ci module
    const bm = new BM(config);
    const currentRoot = utils.getCurrentRoot() + Constants.SITES_META_FOLDER;
    const archiveName = `sites_${config.codeVersion}.zip`;
    const rootPrefix = path.basename(archiveName, '.zip') + '/';

    if (!arrayWithGlob) arrayWithGlob = ['**/*.xml'];

    return (function () {
        Log.info(chalk.cyan('Creating archive of sites.'));
        return utils.compress(currentRoot, archiveName, arrayWithGlob, rootPrefix, config);
    })().then(function () {
        Log.info(chalk.cyan('Uploading archive.'));
        return bm.uploadSitesArchive(archiveName);
    }).then(function () {
        Log.info(chalk.cyan('Login into BM.'));
        return bm.login();
    }).then(function () {
        Log.info(chalk.cyan('Ensure no import currently being processed.'));
        return bm.ensureNoImport(archiveName);
    }).then(function () {
        Log.info(chalk.cyan('Importing sites.'));
        return bm.importSites(archiveName);
    }).then(function () {
        Log.info(chalk.cyan('Check import progress.'));
        return bm.checkImportProgress(archiveName);
    }).then(function () {
        Log.info(chalk.cyan('Removing archive.'));
        return bm.deleteSitesArchive(archiveName);
    }).then(function () {
        return utils.delete(archiveName).then(function () {
            Log.info(chalk.cyan('Site meta imported.'));
        });
    }, function (err) {
            return utils.delete(archiveName)
            .then(function () {
                Log.info(chalk.red('Error occurred.'));
                Log.error(err);
        });
    });
}

module.exports = uploadSitesMeta;
