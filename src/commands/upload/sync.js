/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('davos');
exports.command = 'sync'
exports.aliases = ['s']
exports.desc = 'Synchronize code'
exports.builder = {}
exports.handler = (argv) => {
   new Davos.Core(argv).sync();
}
