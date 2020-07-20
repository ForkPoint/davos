'use strict'

const yargs = require('yargs');
exports.command = 'completion';
exports.aliases = ['comp'];
exports.desc = 'Print shell completion script';
exports.builder = {};
exports.handler = (argv) => {
  yargs.showCompletionScript().argv
};
