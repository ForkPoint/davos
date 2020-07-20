'use strict'

const Davos = require('../../main');
const Log = require('../../logger');

exports.command = 'create';
exports.aliases = ['c'];
exports.desc = 'Pack the sites folder';
exports.builder = {};

exports.handler = async (argv) => {
    const siteName = argv.site;
    const {output} = argv;
    const davos = new Davos();

    Log.info('Attempting to pack site...');

    await davos.pack(siteName, output, argv);
};
