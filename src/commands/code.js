'use strict'

exports.command = 'code <command>';
exports.desc = 'Code operations';
exports.aliases = ['c'];
exports.builder = function (yargs) {
    return yargs.commandDir('code');
};
exports.handler = (argv) => console.log('Invalid code command');
