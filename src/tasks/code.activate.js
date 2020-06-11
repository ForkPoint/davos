/** Modules */
const sfccCode = require('sfcc-ci').code;
const chalk = require('chalk');

/** Internal modules */
const Log = require('../logger');

function activateCodeVersion(instance, token, version) {
    Log.info(`Trying to activate ${chalk.cyan(version)}...`);

    sfccCode.activate(instance, version, token, (err) => {
        if (err) {
            Log.error(`Could not activate code version ${version}: ${err}`)
        }

        Log.info(`${chalk.cyan(version)} active on ${chalk.green(instance)}`);
    });
}

module.exports = activateCodeVersion;
