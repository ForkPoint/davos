exports.command = 'upload <command>';
exports.desc = 'Upload operations';
exports.aliases = ['u'];
exports.builder = function (yargs) {
    return yargs.commandDir('upload');
};
exports.handler = (argv) => console.log('Invalid upload command');
