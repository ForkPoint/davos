(function () {
  'use strict';

  // Imports
  const chalk = require('chalk'),
    Davos = require('../index'),
    ConfigManager = new Davos.ConfigManager(),
    Log = Davos.Logger;

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
  let args = process.argv;
  let commandParam = args[2];
  let configlessCommands = [undefined, 'create', '-h', '--help', 'split', 'merge'];

  let isConfiglessCommand = configlessCommands.indexOf(commandParam) > -1;
  if (!isConfiglessCommand && !ConfigManager.isConfigExisting()) {
    Log.error(chalk.red(`\nCannot find configuration in [${process.cwd()}].`));
    return;
  }

  //var configPath = path.join(process.cwd().getConfigName());
  if (!isConfiglessCommand) {
    activeConfig = ConfigManager.loadConfiguration().getActiveProfile();
  }

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
    .usage(`${chalk.yellow(`${yargonaut.asFont('davos', 'Cyberlarge')}`)}\n${chalk.bold.underline('Usage:')}\n$0 <command> [options]`)
    .commandDir('commands')

    .example('davos create', 'create the config file')
    .example('davos insert', 'insert new profile in the config file')
    .example('davos profile insert [name of profile]', 'edit the specified profile in the config file')
    .example('davos profile switch [name of profile]', 'switch to specified profile in the config file')
    .example('davos profile list', 'list profiles in the config file')
    .example('davos sync --delete [boolean]', 'sync the cartridges on the server with your local cartridges. If delete option is passed, the cartridges on the server that does not exist in your local cartridges will be deleted.')
    .example('davos upload cartridges --cartridge [path to cartridge]', 'upload all cartridges from your configuration or a specific single cartridge from your local cartridges')
    .example('davos upload sites --meta [path to meta]', 'import sites meta')
    .example("davos upload meta --pattern *.xml", "Upload and import all meta files matching the pattern. Default pattern is *")
    .example('davos watch --cartridge [path to cartridge]', 'watch all cartridges from your configuration for changes or a specific single cartridge from your local cartridges')
    .example("davos meta split [path/to/bundle.xml] --out dir/for/chunks", "split a meta/library bundle into chunks by attribute group or content assets. Path must be relative starting from site_template directory.")
    .example("davos meta merge [pattern] --out bundle.xml", "merge all files matching the pattern into a bundle.xml in your CWD")

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
