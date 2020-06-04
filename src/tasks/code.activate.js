const BM = require('../bm');
const Log = require('../logger');

function activateCodeVersion(config) {
    const bm = new BM(config); // BM will be obsolete in the future

    return (function () {
        Log.info(chalk.cyan(`Logging in to Business Manager.`));
        return bm.login();
    })().then(function () {
        Log.info(chalk.cyan(`Activating code version [${config.codeVersion}]`));
        return bm.activateCodeVersion();
    }, function (err) {
        Log.error(err);
        return Promise.reject(err);
    });
}

module.exports = activateCodeVersion;
