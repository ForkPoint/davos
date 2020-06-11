/** Modules */
const chalk = require('chalk');

/** Internal modules */
const Log = require('../logger');
const cartridgeHelper = require('../cartridge-helper');

async function ListDeployCartridges(config, token) {
    const archiveName = `cartriges_${config.codeVersion}.zip`;
    const cartridges = cartridgeHelper.getCartridges(false, config);

    Log.info('Cartridge list for deploy');
    Log.info('-------------------------');

    cartridges.forEach(cartridge => Log.info(chalk.cyan(cartridge)));
}

module.exports = ListDeployCartridges;
