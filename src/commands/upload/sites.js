'use strict'

const Davos = require('../../main');

exports.command = 'sites';
exports.aliases = ['site'];
exports.desc = 'Upload sites metadata and do full site import';
exports.builder = {};
exports.handler = async (argv) => {
   const davos = new Davos(argv);

   /** Upload and import the meta */
   davos.uploadSitesMeta(argv.f);
};
