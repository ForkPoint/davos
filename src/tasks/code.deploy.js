/** Modules */
const sfccCode = require('sfcc-ci').code;
const chalk = require('chalk');

/** Internal modules */
const Log = require('../logger');
const utils = require('../util');
const cartridgeHelper = require('../cartridge-helper');

async function DeployCodeVersion(config, token) {
    const rootDir = utils.getCurrentRoot();
    const tempDir = utils.getTempDir(config);
    const archiveName = `cartriges_${config.codeVersion}.zip`;
    const cartridges = cartridgeHelper.getCartridges(false, config);
    const zipPath = `${rootDir}/${tempDir}/${archiveName}`;
    const options = config.Has('pfx') ? {
        pfx: `${rootDir}/${config.pfx}`,
        passphrase: config.passphrase
    } : {};

    await utils.compress(cartridgeHelper.getCartridgesPath(), archiveName, cartridges.map(name => name + "/**"), config.codeVersion + '/', config);

    Log.info(`Deploying to ${chalk.cyan(config.hostname)}...`);

    return new Promise((res, rej) => {
        sfccCode.deploy(config.hostname, zipPath, token, options, (err) => {
            if (err) {
                Log.error('Error while deploying code version.');
                rej(err);
                return;
            }
    
            Log.info(`Successfully deployed ${config.codeVersion} to ${config.hostname}`);
            res();
        });
    }).catch(err => Log.error(err));
}

module.exports = DeployCodeVersion;
