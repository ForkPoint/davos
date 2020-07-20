'use strict'

const Davos = require('../../main');
const Log = require('../../logger');

exports.command = 'import';
exports.aliases = ['i'];
exports.desc = 'Import the packed site';
exports.builder = {};

exports.handler = async (argv) => {
    const davos = new Davos();
    const {name} = argv;

    Log.info('Attempting to import site package...');

    await davos.importPackage(name);
};
