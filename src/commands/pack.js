'use strict'

exports.command = 'pack <command>';
exports.desc = 'Package operations';
exports.aliases = ['p'];
exports.builder = function (yargs) {
    return yargs.commandDir('package');
};
exports.handler = (argv) => console.log('Invalid package command');
