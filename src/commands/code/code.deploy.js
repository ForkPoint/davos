/* eslint no-unused-vars:0, no-unused-expressions:0 */
const Davos = require('../../main');

exports.command = 'deploy';
exports.aliases = ['d'];
exports.desc = 'Deploys code version to instance';
exports.builder = {};
exports.handler = async (argv) => {
    const davos = new Davos(argv);
    const sfccMgr = davos.SFCCManager;

    if (davos.ConfigManager.getActiveConfig().list) {
        davos.listDeploy();
    } else {
        /** Authenticate first */
        await sfccMgr.Authenticate();

        /** list the code versions */
        davos.deployCodeVer(sfccMgr.token);
    }
};
