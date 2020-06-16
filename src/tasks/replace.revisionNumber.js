const globby = require('globby');
const fs = require('fs');
const utils = require('../util');

/**
 * Replace a placeholder in all files matching pattern with the current code version defined in davos.json.
 *
 * @param {string} pattern Starts from project root or cwd
 * @param {string} placeholder A string to look for
 */
function replaceRevisionNumber(pattern, placeholder = "@BUILD_NUMBER@", config) {
    const regex = new RegExp(placeholder, "g");
    const root = utils.getCurrentRoot(); // get current root from config
    
    return globby(root + "/" + pattern).then(files => {
        files.forEach(file => {
            let content = fs.readFileSync(file).toString();

            if (~content.search(placeholder)) {
                fs.writeFileSync(file, content.replace(regex, config.codeVersion));
            }
        })
    });
}

module.exports = replaceRevisionNumber;
