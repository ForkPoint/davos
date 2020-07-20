'use strict'

const ConfigEditor = require('../../config-editor');

exports.command = 'list';
exports.aliases = ['l'];
exports.desc = 'List available profiles';
exports.builder = {};
exports.handler = (argv) => {
   new ConfigEditor(argv).listProfiles();
};
