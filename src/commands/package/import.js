/* eslint no-unused-vars:0, no-unused-expressions:0 */
const Davos = require('../../main');
const Log = require('../../logger');

exports.command = 'import';
exports.aliases = ['i'];
exports.desc = 'Import the packed site';
exports.builder = {};

exports.handler = async (argv) => {
    const davos = new Davos();
    const name = argv.name;

    Log.info('Attempting to import site package...');

    await davos.importPackage(name);
};
