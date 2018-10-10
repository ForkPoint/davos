/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('../../../index'),
ConfigEditor = require('../../config-editor');
exports.command = 'insert [name]'
exports.aliases = ['i']
exports.desc = 'Insert a new profile'
exports.builder = {}
exports.handler = (argv) => {
   new ConfigEditor(argv).insertProfile();
}
