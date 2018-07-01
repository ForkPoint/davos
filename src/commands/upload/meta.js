/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('davos');
exports.command = 'meta'
exports.aliases = ['metdata']
exports.desc = 'Import a single metadata file'
exports.builder = {}
exports.handler = (argv) => {
   new Davos.Core(argv).uploadMeta();
}
