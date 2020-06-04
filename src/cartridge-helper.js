const path = require('path');
const utils = require('./util');
const Constants = require('./constants');

function getCartridgesPath() {
    return path.join(utils.getCurrentRoot(), Constants.CARTRIDGES_FOLDER);
}

/**
 * Get cartridge names in an array.
 * [From Config Manager]
 * @param {bool} all whether to return all cartridges or only selected in config
 */
function getCartridges(all = false) {
    if (all || !this.config.cartridge) {
        let cartridgesDir = getCartridgesPath();

        return fs.readdirSync(cartridgesDir).filter(dir => {
            return fs.lstatSync(path.join(cartridgesDir, dir)).isDirectory();
        });
    } else {
        return this.config.cartridge;
    }
}

// function getCartridges(currentRoot) {
//     let result = [];

//     currentRoot = path.join(currentRoot, "/cartridges")

//     let paths = globby.sync(['**/cartridge'], {
//         cwd: currentRoot,
//         dot: true,
//         nosort: true,
//         absolute: true,
//         deep: 1,
//         onlyDirectories: true,
//         ignore: Constants.GLOB_IGNORED
//     });

//     paths.forEach(function (filePath) {
//         let absolutePath = filePath,
//             relativeCartridgePath = path.relative(currentRoot, absolutePath),
//             relativePath = path.dirname(relativeCartridgePath).replace(/\\/g, '/');

//         result.push(relativePath);
//     });

//     return result;
// }

module.exports = {
    getCartridgesPath: getCartridgesPath,
    getCartridges: getCartridges
};