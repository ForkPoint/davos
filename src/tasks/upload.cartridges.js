const Log = require('../logger');
const WebDav = require('../webdav');
const utils = require('../util');
const chalk = require('chalk');
const cartridgeHelper = require('../cartridge-helper');

function uploadCartridges(config) {
    // webdav will be obsolete, use sfcc-ci module
    const webdav = new WebDav(config);
    const archiveName = `cartriges_${config.codeVersion}.zip`;
    const cartridges = cartridgeHelper.getCartridges(false, config);

    Log.info(chalk.cyan(`Creating archive of ${cartridges.length} cartridges: ${cartridges.join(", ")}`));

    return utils.compress(cartridgeHelper.getCartridgesPath(), archiveName, cartridges.map(name => name + "/**"), '', config).then(function () {
        Log.info(chalk.cyan(`Uploading archive.`));
        return webdav.put(archiveName, {
            fromTmpDir: true
        });
    }).then(function () {
        Log.info(chalk.cyan(`Unzipping archive, code version: ${config.codeVersion}`));
        return webdav.unzip(archiveName);
    }).then(function () {
        Log.info(chalk.cyan(`Removing archive.`));
        return webdav.delete(archiveName);
    }).then(function () {
        return utils.deleteArchive(archiveName, null, config).then(function () {
            Log.info(chalk.cyan(`Cartriges uploaded.`));
        });
    }, function (err) {
            return utils.deleteArchive(archiveName, null, config).then(function () {
            Log.info(chalk.red(`Error occurred.`));
            Log.error(err);
            console.log(err);
        });
    });
}

module.exports = uploadCartridges;