(function () {
  'use strict';

  // Imports
  const chalk = require('chalk'),
    Davos = require('../index'),
    // ConfigManager = new Davos.ConfigManager(),
    Log = require('./logger');

  const yargonaut = require('yargonaut')
  .style('bold.underline', 'Commands:')
  .style('bold.underline', 'Options:')
  .style('bold.cyan', 'boolean')
  .style('bold.yellow', 'string')
  .style('bold.magenta', 'number')
  .style('bold.blue', 'default:')
  .style('bold.green', 'aliases:')
  .style('yellow', 'required')
  .style("blue")
  .style("yellow", "required")
  .errorsStyle("red")
  .helpStyle('green.bold');

  // Local dependencies
  const ConfigEditor = require('./config-editor');

  let argv, activeConfig;
//   let args = process.argv;
//   let configlessCommands = [undefined, 'create', '-h', '--help', 'split', 'merge'];
//   let isConfiglessCommand = false;
//   for (let p = 0; p < configlessCommands.length; p++){
//     if (args.indexOf(configlessCommands[p]) > -1) {
//         isConfiglessCommand = true;
//         break;
// 	}
//   }

//   if (!isConfiglessCommand && !ConfigManager.isConfigExisting()) {
//     Log.error(chalk.red(`\nCannot find configuration in [${process.cwd()}].`));
//     return;
//   }

  //var configPath = path.join(process.cwd().getConfigName());
//   if (!isConfiglessCommand) {
//     activeConfig = ConfigManager.loadConfiguration().getActiveProfile();
//   }

  /**
    profile
      insert
      list
      edit
      switch

    setup
    sync
    watch

    upload
      code
      site
      meta

    meta
      split
      merge
   */
  var yargs = require('yargs');
  argv = yargs
    .version()
    .usage(`${chalk.yellow(`${yargonaut.asFont('davos', 'Cyberlarge')}`)}\n${chalk.bold.underline('Usage:')}\ndavos <command> [options]`)
    .commandDir('commands')

    .example('davos create', 'create the config file')
    .example('davos insert', 'insert new profile in the config file')
    .example('davos profile insert [name of profile]', 'edit the specified profile in the config file')
    .example('davos profile switch [name of profile]', 'switch to specified profile in the config file')
    .example('davos profile list', 'list profiles in the config file')
    .example('davos upload cartridges', 'upload all cartridges from your configuration or a specific single cartridge from your local cartridges')
    .example('davos upload sites', 'import sites meta')
    .example('davos upload sites --f [meta file name]', 'import specific meta file')
    .example('davos watch', 'watch all cartridges from your configuration for changes or a specific single cartridge from your local cartridges')
    .example("davos meta split --in [path/to/bundle.xml] --out dir/for/chunks", "split a meta/library bundle into chunks by attribute group or content assets. Path must be relative starting from sites/site_template/ directory.")
    .example("davos meta merge --in [pattern] --out bundle.xml", "merge all files matching the pattern into a bundle.xml in your CWD")
    .example("davos code list", "Lists the current code versions available on the current active profile instance")
    .example("davos code activate --ver [code version name]", "Activates the given code version on the current active profile instance")
    .example("davos code shift", "Shifts the code versions. Selects the first non-active, activates it, then switches back to the previous code version")
    .example("davos code deploy (able to deploy to PIG instances, if the profile contains 'pfx' (p12 certificate) and 'passphrase' properties", "Deploys the current code base to the active profile instance")
    .example("davos code deploy --list", "Lists the codebase cartridges that will be uploaded to the active profile code version in the instance")

    .config(activeConfig)
    .options({
      'profile': {
        alias: 'P',
        describe: 'Profile to activate'
      },
      'cartridge': {
        alias: 'c',
        describe: 'Cartridge to upload/watch.'
      },
      'username': {
        alias: 'u',
        describe: 'Username of your Sandbox'
      },
      'password': {
        alias: 'p',
        describe: 'Password of your Sandbox'
      },
      'hostname': {
        alias: 'H',
        describe: 'Sandbox URL'
      },
      'verbose': {
        describe: 'verbose'
      },
    })
    .help('h')
    .alias('h', 'help')
    .option('v', {
      alias: 'verbose',
      type: 'boolean',
      desc: 'Verbose output'
    })
    .version('V', 'Show current version', require('../package.json').version)
    .alias('V', 'version')
    .demandCommand(1, 'You need at least one command before moving on')
    .recommendCommands()
    .wrap(80)//yargs.terminalWidth())
    .showHelpOnFail(true, 'Specify --help for available options')
    .epilog('For more information on Davos, go to https://forkpoint.com/products/davos')
    .argv;

}());
