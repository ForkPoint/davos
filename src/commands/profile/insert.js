'use strict'

const ConfigEditor = require('../../config-editor');

exports.command = 'insert [name]';
exports.aliases = ['i'];
exports.desc = 'Insert a new profile';
exports.builder = {};
exports.handler = (argv) => {
   new ConfigEditor(argv).insertProfile();
};
