
const Davos = require('../../main');
const Log = require('../../logger');

exports.command = 'merge';
exports.aliases = ['m'];
exports.desc = 'Merge metadata';
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

    Log.info('Metadata merge in progress');

    await davos.merge(argv.in, argv.out, argv.force);
  } else {
    Log.error('Please provide in and out params: --in "path/to/split/meta" --out "output/folder/filename.xml"');
  }
};
