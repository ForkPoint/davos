
const ConfigEditor = require('../../config-editor');

exports.command = 'switch [name]';
exports.aliases = ['sw'];
exports.desc = 'Switch to profile';
exports.builder = {};
exports.handler = (argv) => {
   const configEditor = new ConfigEditor();
   const {name} = argv;

   configEditor.switchProfile(name);
};
