'use strict'

const Davos = require('../../main');

exports.command = 'code';
exports.aliases = ['cartridges'];
exports.desc = 'Upload all code/cartridges';
exports.builder = {};
exports.handler = async (argv) => {
   const davos = new Davos(argv);

   davos.uploadCartridges();
};
