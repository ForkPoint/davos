/* eslint no-unused-vars:0, no-unused-expressions:0 */
const Davos = require('../../main');

exports.command = 'list';
exports.aliases = ['l'];
exports.desc = 'List code versions';
exports.builder = {};
exports.handler = async (argv) => {
    const davos = new Davos(argv);

    /** list the code versions */
    davos.listCode();
};
