/* eslint no-unused-vars:0, no-unused-expressions:0 */
const Davos = require('../../main');

exports.command = 'deploy';
exports.aliases = ['d'];
exports.desc = 'Deploys code version to instance';
exports.builder = {};
exports.handler = async (argv) => {
    const davos = new Davos(argv);

    if (davos.ConfigManager.getActiveConfig().list) {
        davos.listDeploy();
    } else {
        /** list the code versions */
        davos.deployCodeVer(sfccMgr.token);
    }
};
