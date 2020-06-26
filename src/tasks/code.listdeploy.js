/** Modules */
const chalk = require('chalk');

/** Internal modules */
const Log = require('../logger');
const cartridgeHelper = require('../cartridge-helper');

async function ListDeployCartridges(config) {
    const cartridges = cartridgeHelper.getCartridges(false, config);

    Log.info('Cartridge list for deploy');
    Log.info('-------------------------');

    cartridges.forEach(cartridge => Log.info(chalk.cyan(cartridge)));
}

module.exports = ListDeployCartridges;
