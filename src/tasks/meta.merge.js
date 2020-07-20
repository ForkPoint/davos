'use strict';

const path = require('path');
const merger = require('../merger');
const globby = require('globby');
const fs = require('fs');
const Log = require('../logger');
const util = require('../util');

async function merge(paramIn, paramOut, force, config) {
    const root = util.getCurrentRoot();
    let pattern;
    let out;
    let outPath;
    let outWithoutFile;

    if (!config.Has('command')) {
        if (!paramIn || !paramOut) {
            Log.error('Please provide input and output.');
            return;
        }

        config.SetProperty('command', {
            in: paramIn,
            out: paramOut,
            force: force === '--force' ? force : false
        });
    }

    pattern = path.join(root, config.command.in).replace(/\\/g, '/');
    out = config.command.out;
    outPath = path.join(root, out);
    outWithoutFile = outPath.substring(0, outPath.lastIndexOf(path.sep));

    // use config manager to checkPath
    if (!util.checkPath(config, pattern, outWithoutFile)) return false;

    return new Promise((r, e) => {
        globby(pattern).then(files => {
            let dir;

            if (!files.length) return r();

            dir = path.dirname(files[0]);

            try {
                merger.merge(config, files).then(result => {
                    fs.writeFile(out || (`${dir  }/bundle.xml`), result, 'utf8', (err) => {
                        if (err) e(err)
                        Log.info('Write successfull');
                        r();
                    });
                }).catch(e);
            } catch (err) {
                e(err);
            }
        });
    }).catch(err => Log.error(err));
}

module.exports = merge;
