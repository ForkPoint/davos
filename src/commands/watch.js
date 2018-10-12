/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('../../index');
exports.command = 'watch';
exports.aliases = ['w'];
exports.desc = '';
exports.builder = {};
exports.handler = (argv) => {
   new Davos.Core(argv).watch();
};
