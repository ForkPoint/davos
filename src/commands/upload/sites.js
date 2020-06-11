/* eslint no-unused-vars:0, no-unused-expressions:0 */
const Davos = require('../../main');

exports.command = 'sites';
exports.aliases = ['site'];
exports.desc = 'Upload sites metadata and do full site import';
exports.builder = {};
exports.handler = async (argv) => {
   const davos = new Davos(argv);
   const sfcc = davos.SFCCManager;

   /** Authenticate */
   await sfcc.Authenticate();

   /** Upload and import the meta */
   davos.uploadSitesMeta(argv.f);
};
