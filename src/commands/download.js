'use strict'

exports.command = 'download <command>';
exports.desc = 'download operations';
exports.aliases = ['dl'];
exports.builder = function (yargs) {
    return yargs.commandDir('download');
};
exports.handler = (argv) => console.log('Invalid download command');
