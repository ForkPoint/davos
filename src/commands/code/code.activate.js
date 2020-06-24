/* eslint no-unused-vars:0, no-unused-expressions:0 */
const Davos = require('../../main');
const Log = require('../../logger');

exports.command = 'activate';
exports.aliases = ['ac'];
exports.desc = 'Activate specified code version';
exports.builder = {};
exports.handler = async (argv) => {
    const davos = new Davos(argv);

    if (!argv.ver) {
        Log.error('Please specify the name of the code version: --ver "Name"');
        return;
    }

    /** list the code versions */
    davos.activateCodeVersion(argv.ver);
};
