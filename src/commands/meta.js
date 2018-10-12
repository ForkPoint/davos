exports.command = 'meta <command>';
exports.desc = 'Metadata operations';
exports.builder = function (yargs) {
    return yargs.commandDir('meta');
};
exports.handler = (argv) => console.log('Invalid metadata command');
