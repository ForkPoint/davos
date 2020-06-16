const Davos = require('../../index');
const Log = require('../logger');
exports.command = 'release';
exports.aliases = ['r'];
exports.desc = '';
exports.builder = {};
exports.handler = (argv) => {
    Log.info("Git log diff info in progress...");
    const params = {
        git: argv
    };
    const davos = new Davos(params);
    davos.gitLogDiff(davos.ConfigManager.getActiveProfile().config);
}
