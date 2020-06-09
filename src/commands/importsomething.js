/* eslint no-unused-vars:0, no-unused-expressions:0 */
const Davos = require('../main');

exports.command = 'importsmth';
exports.aliases = ['ismth'];
exports.desc = '';
exports.builder = {};
exports.handler = async (argv) => {
    const davos = new Davos(argv);
    const sfccMgr = davos.SFCCManager;
    const fileName = argv.name;

    /** Authenticate first */
    await sfccMgr.Authenticate();


    /** Upload file */
    sfccMgr.Import(fileName);
};
