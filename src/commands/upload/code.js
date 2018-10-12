/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('../../../index');
exports.command = 'code';
exports.aliases = ['cartridges'];
exports.desc = 'Upload all code/cartridges';
exports.builder = {};
exports.handler = (argv) => {
   new Davos.Core(argv).uploadCartridges();
};
