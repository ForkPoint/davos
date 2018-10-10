/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('../../../index'),
ConfigEditor = require('../../config-editor');
exports.command = 'edit [name]'
exports.aliases = ['e']
exports.desc = 'Edit profile'
exports.builder = {}
exports.handler = (argv) => {
   new ConfigEditor(argv).editProfile();
}
