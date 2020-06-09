/* eslint no-unused-vars:0, no-unused-expressions:0 */
const Davos = require('../main');

exports.command = 'listjobs';
exports.aliases = ['lb'];
exports.desc = '';
exports.builder = {};
exports.handler = async (argv) => {
    const davos = new Davos(argv);
    const sfccMgr = davos.SFCCManager;
    
    sfccMgr.ListImportJobs();
};
