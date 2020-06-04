const path = require('path');
const merger = require('../merger');
const globby = require('globby');
const fs = require('fs');
const Log = require('../logger');

async function merge(paramIn = null, paramOut = null, force = null, config) {
    if (paramIn !== null && paramOut !== null) {
        if (config == undefined) {
            config = {};
        }
        config.command = { in: paramIn, out: paramOut };
        if (force !== null && force == '--force') {
            config.command.force = true;
        }
    } else {
        // use config manager to checkForParametersInConfig
        if (config.checkForParametersInConfig(config.command, 'in', 'out') === false) {
            return false;
        }
    }

    // use config manager to getCurrentRoot()
    const root = config.getCurrentRoot();
    const pattern = path.join(root, config.command.in);
    const out = config.command.out;
    const outPath = path.join(root, out);
    const outWithoutFile = outPath.substring(0, outPath.lastIndexOf(path.sep));

    let dir;

    // use config manager to checkPath
    if (!config.checkPath(config, pattern, outWithoutFile)) {
        return false;
    }

    return new Promise((r, e) => {
        globby(pattern).then(files => {
            if (!files.length) {
                return r();
            }

            dir = path.dirname(files[0]);

            try {
                merger.merge(config, files).then(result => {
                    fs.writeFile(out || (dir + "/bundle.xml"), result, 'utf8', function (err) {
                        if (err) e(err)
                        Log.info(`Write successfull`);
                        r();
                    });
                }).catch(e);
            } catch (err) {
                e(err);
            }
        });
    })
}

module.exports = merge;
