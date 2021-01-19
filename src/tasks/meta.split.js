'use strict';

const path = require('path');
const splitter = require('../splitter');
const utils = require('../util');
const Log = require('../logger');

async function split(paramIn, paramOut, force, config) {
    const root = utils.getCurrentRoot();
    let bundle;
    let out;
    let bundleWithOutFile;

    if (!config.Has('command')) {
        if (!paramIn || !paramOut) {
            Log.error('Please provide input and output.');
            return;
        }

        config.SetProperty('command', {
            in: paramIn,
            out: paramOut,
            force: force
        });
    }

    bundle = path.join(root, config.command.in);
    out = path.join(root, config.command.out);
    bundleWithOutFile = bundle.substring(0, bundle.lastIndexOf(path.sep));

    if (!utils.checkPath(config, bundleWithOutFile, out)) return false;


    Log.info('Running split with input '+ bundle +' and output ' + out + ' ' + (force?'forcing output folder creation':''));

    return splitter.split(config, bundle, out);
}

module.exports = split;
