/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('../../../index');
exports.command = 'meta'
exports.aliases = ['metdata']
exports.desc = 'Import a single metadata file'
exports.builder = {}
exports.handler = (argv) => {
   new Davos.Core(argv).uploadMeta();
}
