/* eslint no-unused-vars:0, no-unused-expressions:0 */
const Davos = require('../../main');

exports.command = 'code';
exports.aliases = ['cartridges'];
exports.desc = 'Upload all code/cartridges';
exports.builder = {};
exports.handler = async (argv) => {
   const davos = new Davos(argv);

   davos.uploadCartridges();
};
