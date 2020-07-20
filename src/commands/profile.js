'use strict'

exports.command = 'profile <command>';
exports.desc = 'Profile management';
exports.builder = function (yargs) {
    return yargs.commandDir('profile');
};
exports.handler = (argv) => console.log('Invalid profile command');
