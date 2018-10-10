/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('../../index'),
ConfigEditor = require('../config-editor');
exports.command = 'setup'
exports.aliases = ['create', 'init']
exports.desc = ''
exports.builder = {}
exports.handler = (argv) => {
   new ConfigEditor(argv).createConfig();
}
