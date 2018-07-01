/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('../../davos'),
ConfigEditor = require('../../config-editor');
exports.command = 'switch [name]'
exports.aliases = ['sw']
exports.desc = 'Switch to profile'
exports.builder = {}
exports.handler = (argv) => {
   new ConfigEditor(argv).switchProfile();
}
