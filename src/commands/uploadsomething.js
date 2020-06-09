/* eslint no-unused-vars:0, no-unused-expressions:0 */
const Davos = require('../main');

exports.command = 'uploadsmth';
exports.aliases = ['usmth'];
exports.desc = '';
exports.builder = {};
exports.handler = async (argv) => {
    const davos = new Davos(argv);
    const sfccMgr = davos.SFCCManager;

    /** Authenticate first */
    await sfccMgr.Authenticate();

    /** Upload meta */
    sfccMgr.Upload();
};
