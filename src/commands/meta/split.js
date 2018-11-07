/* eslint no-unused-vars:0, no-unused-expressions:0 */
const yargs = require('yargs'),
Davos = require('../../../index');
Log = Davos.Logger;
exports.command = 'split';
exports.aliases = ['s'];
exports.desc = 'Split metadata';
exports.builder = {
  out: {
    alias: 'o',
    describe: 'Output folder',
  }
};
exports.handler = (argv) => {
   Log.info("Metadata split in progress");
   const params = {command: {in: argv.in, out: argv.out}}
   if(argv.force){
     params.command.force = true;
   }
   new Davos.Core(params, false).split();
};
