const path = require('path');
const utils = require('./util');
const Constants = require('./constants');
const fs = require('fs');
const glob = require('glob');

function getCartridgesPath() {
    return path.join(utils.getCurrentRoot(), Constants.CARTRIDGES_FOLDER);
}

/**
 * Get cartridge names in an array.
 * [From Config Manager]
 * @param {bool} all whether to return all cartridges or only selected in config
 */
function getCartridges(all = false, config) {
    if (all || !config.cartridge) {
        let cartridgesDir = getCartridgesPath();

        return fs.readdirSync(cartridgesDir).filter(dir => {
            return fs.lstatSync(path.join(cartridgesDir, dir)).isDirectory();
        });
    } else {
        return config.cartridge;
    }
}

function getCartridgesFromDir(dir) {
    let result = [];

    dir = path.join(dir, "/cartridges");

    let paths = glob.sync('**/cartridge/', {
        cwd: dir,
        dot: true,
        nosort: true,
        absolute: true,
        ignore: Constants.GLOB_IGNORED
    });

    paths.forEach(function (filePath) {
        let absolutePath = filePath,
            relativeCartridgePath = path.relative(dir, absolutePath),
            relativePath = path.dirname(relativeCartridgePath).replace(/\\/g, '/');

        result.push(relativePath);
    });

    return result;
}

module.exports = {
    getCartridgesPath: getCartridgesPath,
    getCartridges: getCartridges,
    getCartridgesFromDir: getCartridgesFromDir
};