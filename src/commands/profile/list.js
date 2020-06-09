/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('../../../index'),
ConfigEditor = require('../../config-editor');
exports.command = 'list';
exports.aliases = ['l'];
exports.desc = 'List available profiles';
exports.builder = {};
exports.handler = (argv) => {
   new ConfigEditor(argv).listProfiles();
};