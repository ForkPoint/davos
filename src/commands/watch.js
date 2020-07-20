
const Davos = require('../../index');

exports.command = 'watch';
exports.aliases = ['w'];
exports.desc = '';
exports.builder = {};
exports.handler = (argv) => {
   new Davos(argv).watch();
};
