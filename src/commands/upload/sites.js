/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('davos');
exports.command = 'sites'
exports.aliases = ['site']
exports.desc = 'Upload sites metadata and do full site import'
exports.builder = {}
exports.handler = (argv) => {
   new Davos.Core(argv).uploadSitesMeta();
}
