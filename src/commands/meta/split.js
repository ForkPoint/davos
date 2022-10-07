
const Davos = require('../../main');
const Log = require('../../logger');

exports.command = 'split';
exports.aliases = ['s'];
exports.desc = 'Split metadata';
exports.builder = {
  out: {
    alias: 'o',
    describe: 'Output folder',
  }
};
exports.handler = async (argv) => {
  if (argv.in && argv.out) {

    const davos = new Davos();
    Log.info('Metadata split in progress');
    await davos.split(argv.in, argv.out, argv.force);

  } else {
    Log.error('Please provide in and out params: --in "path/to/file.xml" --out "output/folder"');
  }
};
