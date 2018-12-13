/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('../../../index');
exports.command = 'merge';
exports.aliases = ['m'];
exports.desc = 'Merge metadata';
exports.builder = {
  out: {
    alias: 'o',
    describe: 'Output folder',
  }
};
exports.handler = (argv) => {
  Log.info("Metadata merge in progress...");
  const params = {
    command: argv
  };
  new Davos.Core(params).merge();
};
