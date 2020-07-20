'use strict'


const Davos = require('../../main');
const Log = require('../../logger');

exports.command = 'asset';
exports.aliases = ['a'];
exports.desc = 'Download a content asset from a library';
exports.builder = {};
exports.handler = async (argv) => {
    const davos = new Davos(argv);

    if (!argv.aid || !argv.lib || !argv.output) {
        Log.error('Please specify the ID of the content asset and library: --aid="assetID" --lib="libraryID | siteID" --output=path/to/folder');
        return;
    }

    /** list the code versions */
    davos.downloadAsset(argv.aid, argv.lib, argv.output);
};
