
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
    const params = {
      command: {
        in: argv.in,
        out: argv.out,
        force: argv.force
      }
    };
    const davos = new Davos(params);

    Log.info('Metadata split in progress');

    await davos.split();
  } else {
    Log.error('Please provide in and out params: --in "path/to/file.xml" --out "output/folder"');
  }
};
