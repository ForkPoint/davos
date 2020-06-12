/** Modules */
const sfccCode = require('sfcc-ci').code;
const chalk = require('chalk');

/** Internal modules */
const Log = require('../logger');

function activateCodeVersion(instance, token, version) {
    Log.info(`Trying to activate ${chalk.cyan(version)}...`);

    return new Promise((res, rej) => {
        sfccCode.activate(instance, version, token, (err) => {
            if (err) {
                Log.error(`Could not activate code version ${version}`);
                rej('No such version');
                return;
            }
    
            Log.info(`${chalk.cyan(version)} active on ${chalk.green(instance)}`);
            res();
        });
    }).catch(err => Log.error(err));
}

module.exports = activateCodeVersion;
