'use strict';

// Constants
const createInsertEdit = [{
  name: 'hostname',
  description: 'Hostname of your Sandbox (without https:// prefix)',
  required: true
}, {
  name: 'username',
  description: 'Username of your Sandbox',
  required: true
}, {
  name: 'password',
  hidden: true,
  description: 'Password of your Sandbox (the input won\'t be visible)',
  required: true
}, {
  name: 'codeversion',
  description: 'Code Version (default is version1)',
  default: 'version1'
},{
  name: 'indentSize',
  description: 'Space indentation size for meta files (2 or 4)',
  default: '2'
}, {
  name: 'exclude',
  description: 'Exclude uploading folders and files. Separate all excludes by space',
  default: '**/node_modules/** **/.git/** **/.svn/** **/.sass-cache/**'
}, {
  name: 'templateReplace',
  description: 'Replace custom tags with build information inside your templates. You can add more files and tags at config file.',
  default: '/path/to/cartrige/template/build_info.isml'
}];

/** Modules */
const prompt = require('prompt');
const chalk = require('chalk');

/** Internal modules */
const Davos = require('../index');
const Log = require('./logger');
const Utils = require('./util');
const CartridgeHelper = require('./cartridge-helper');

/**
 * A configuration editor managing users profiles
 */
class ConfigEditor {
  /**
   * Create a configuration editor
   * @param {Object} config The configuration object used by Davos
   * @param {Object} ConfigManagerInstance The passed ConfigManagerInstance object or newly created
   */
  constructor (config) {
    const davos = new Davos();
    this.ConfigManager = davos.ConfigManager;
    this.config = config;
    this.workingDir = Utils.getCurrentRoot();
  }

  /**
   * Create an active configuration profile
   */
  createConfig () {
    const self = this;
    const cartridges = CartridgeHelper.getCartridgesFromDir(self.workingDir);

    if (self.ConfigManager.checkConfigFile()) {
      Log.info(chalk.yellow('\nConfiguration already exists.'));
      return;
    }

    if (cartridges.length < 1) {
      Log.info(chalk.yellow(`No cartridges found in ${self.workingDir} and it's subdirectories.`));
      return;
    }

    prompt.start();
    prompt.get(createInsertEdit, (err, result) => {
      if (err) {
        return Utils.promptError(err);
      }

      self.ConfigManager.saveConfiguration([
        {
          active: true,
          profile: result.hostname.split('-')[0],
          config: {
            hostname: result.hostname,
            username: result.username,
            password: result.password,
            codeVersion: result.codeversion,
            cartridge: cartridges,
            indentSize: result.indentSize,
            exclude: result.exclude.split(' '),
            templateReplace: {
              files: [result.templateReplace],
              pattern: {
                buildVersion: '@DEPLOYMENT_VERSION@'
              }
            }
          }
        }
      ]);
    });
  }

  /**
   * Insert non active profile in the configuration manager
   */
  insertProfile () {
    const self = this;

    prompt.start();
    prompt.get(createInsertEdit, (err, result) => {
      if (err) {
        return Utils.promptError(err);
      }

        const cartridges = CartridgeHelper.getCartridgesFromDir(self.workingDir);
        const profiles = self.ConfigManager.getProfiles();
        const len = profiles.length;
        const newProfile = result.hostname.split('-')[0];

      for (let i = 0; i < len; i++) {
        if (profiles[i].profile === newProfile) {
          Log.info(chalk.yellow(`\nProfile ${newProfile} exists in your current configuration.`));
          return;
        }
      }

      profiles.push({
        active: false,
        profile: result.hostname.split('-')[0],
        config: {
          hostname: result.hostname,
          username: result.username,
          password: result.password,
          codeVersion: result.codeversion,
          cartridge: cartridges,
          indentSize: result.indentSize,
          exclude: result.exclude.split(' '),
          templateReplace: {
            files: [result.templateReplace],
            pattern: {
              buildVersion: '@DEPLOYMENT_VERSION@'
            }
          }
        }
      });

      self.ConfigManager.saveConfiguration(profiles);

      Log.info(chalk.cyan(`\n${newProfile} inserted successfuly.`));
    });
  }

  /**
   * Edit saved profile in the configuration manager
   */
  editProfile () {
    const self = this;
    const profiles = self.ConfigManager.getProfiles();
    const foundProfile = self.ConfigManager.getActiveProfile();
    const len = profiles.length;

    if (foundProfile === undefined) {
      Log.info(chalk.red('\nCannot find profile'));
      return;
    }

    prompt.start();
    prompt.get(createInsertEdit, (err, result) => {
      if (err) {
        return Utils.promptError(err);
      }

      const cartridges = CartridgeHelper.getCartridgesFromDir(self.workingDir);
      const newList = [];

      for (let i = 0; i < len; i++) {
        const currentProfile = profiles[i];

        if (currentProfile === foundProfile) {
          currentProfile.profile = result.hostname.split('-')[0];
          currentProfile.config = {
            hostname: result.hostname,
            username: result.username,
            password: result.password,
            cartridge: cartridges,
            codeVersion: result.codeversion,
            indentSize: result.indentSize,
            exclude: result.exclude.split(' ')
          };
        }

        newList.push(currentProfile);
      }

      self.ConfigManager.saveConfiguration(newList);

      Log.info(chalk.cyan('\nSuccessfuly updated profile'));
    });
  }

  /**
   * List all profiles from the configuration manager
   */
  listProfiles () {
    const profiles = this.ConfigManager.getProfiles();
    const activeProfile = this.ConfigManager.getActiveProfile();
    const len = profiles.length;
    let result;

    for (let i = 0; i < len; i++) {
      const currentProfile = profiles[i];

      result = chalk.bgWhite(chalk.black(currentProfile.profile));

      if (currentProfile === activeProfile) {
        result += chalk.cyan(' <--- active');
      }

      Log.info(`\n${result}`);
    }
  }

  /**
   * Switch the active profile in the configuration manager
   */
  switchProfile (name) {
    const self = this;
    const profiles = self.ConfigManager.getProfiles();
    const foundProfile = self.ConfigManager.getProfile(name);
    const len = profiles.length;
    const newList = [];

    if (foundProfile === undefined) {
      Log.info(chalk.red(`\nCannot find ${name} profile.`));
      return;
    }

    for (let i = 0; i < len; i++) {
      const currentProfile = profiles[i];
      currentProfile.SetActive(currentProfile === foundProfile);
      newList.push(currentProfile);
    }

    self.ConfigManager.saveConfiguration(newList);

    Log.info(chalk.cyan(`\nSwitched to ${foundProfile.profile}. It is now your active profile.`));
  }
}

module.exports = ConfigEditor;
