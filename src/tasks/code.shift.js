/** Modules */
const sfccCode = require('sfcc-ci').code;
const chalk = require('chalk');

/** Internal modules */
const Log = require('../logger');
const util = require('../util');

function getFirstNonActive(versions) {
    return versions.find(ver => !ver.active);
}

function codeShift(config, token) {
    return new Promise((res, rej) => {
        sfccCode.list(config.hostname, token, function (err, list) {
            let activeVer = null;
            let nonActive = null;
            let versions = [];
    
            if (err) {
                rej(err);
                return;
            }
    
            versions = list.data;
    
            if (versions.length <= 1) {
                Log.error('Not enough code versions to do the shift...');
                rej('Not enough code versions to do the shift...');
                return;
            }
    
            activeVer = versions.find(ver => ver.active);
    
            /** show the current versions and active one */
            util.listCodeVersions(versions);
            Log.info('------------------------');
    
            /** get the first non-active version */
            nonActive = getFirstNonActive(versions);
    
            sfccCode.activate(config.hostname, nonActive.id, token, (err) => {
                if (err) {
                    Log.error(`Error while activating code version ${nonActive.id}`);
                    rej(err);
                    return;
                }
    
                Log.info(`Activated: ${chalk.green(nonActive.id)}`);
                Log.info(`Activating previous version ${chalk.cyan(activeVer.id)}...`);
    
                sfccCode.activate(config.hostname, activeVer.id, token, (err) => {
                    if (err) {
                        Log.error(`Error while activating code version ${nonActive.id}`);
                        rej(err);
                        return;
                    }
    
                    Log.info(`Activated previous version: ${chalk.green(activeVer.id)}`);
                    sfccCode.list(config.hostname, token, (err, list) => {
                        if (err) {
                            Log.error('Error while trying to get code versions...');
                            rej(err);
                            return;
                        }
    
                        Log.info('------------------------');
                        util.listCodeVersions(list.data);
                        res();
                    });
                });
            });
        });
    }).catch(err => Log.error(err));
}

module.exports = codeShift;
