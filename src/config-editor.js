(function () {
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
  }, {
    name: 'exclude',
    description: 'Exclude uploading folders and files. Separate all excludes by space',
    default: '**/node_modules/** **/.git/** **/.svn/** **/.sass-cache/**'
  }, {
    name: 'templateReplace',
    description: 'Replace custom tags with build information inside your templates. You can add more files and tags at config file.',
    default: '/path/to/cartrige/template/build_info.isml'
  }];

  // Imports
  const prompt = require('prompt'),
    chalk = require('chalk'),
    Davos = require('../index'),
    Log = Davos.Logger;

  /**
   * A configuration editor managing users profiles
   */
  class ConfigEditor {
    /**
     * Create a configuration editor
     * @param {Object} config The configuration object used by Davos
     * @param {Object} ConfigManagerInstance The passed ConfigManagerInstance object or newly created
     */
    constructor (config, ConfigManagerInstance) {
      this.ConfigManager = ConfigManagerInstance || new Davos.ConfigManager();
      this.config = config;

      return this;
    }

    /**
     * Create an active configuration profile
     */
    createConfig () {
      const self = this;

      let workingDirectory = self.config.basePath || process.cwd(),
        cartridges = self.ConfigManager.getCartridges(workingDirectory);

      if (self.ConfigManager.isConfigExisting()) {
        Log.info(chalk.yellow('\nConfiguration already exists.'));
        return;
      }

      if (cartridges.length < 1) {
        Log.info(chalk.yellow(`No cartridges found in ${workingDirectory} and it's subdirectories.`));
        return;
      }

      prompt.start();
      prompt.get(createInsertEdit, function (err, result) {
        if (err) {
          return self.ConfigManager.promptError(err);
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
              exclude: result.exclude.split(' '),
              templateReplace: {
                files: [result.templateReplace],
                pattern: {
  	              buildVersion: "@DEPLOYMENT_VERSION@"
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
      prompt.get(createInsertEdit, function (err, result) {
        if (err) {
          return self.ConfigManager.promptError(err);
        }

        let workingDirectory = self.config.basePath || process.cwd(),
          cartridges = self.ConfigManager.getCartridges(workingDirectory),
          profiles = self.ConfigManager.loadConfiguration().profiles,
          len = profiles.length,
          newProfile = result.hostname.split('-')[0];

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
            exclude: result.exclude.split(' '),
            templateReplace: {
              files: [result.templateReplace],
              pattern: {
	              buildVersion: "@DEPLOYMENT_VERSION@"
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

      let profile = self.config.name,
        profiles = self.ConfigManager.loadConfiguration().profiles,
        foundProfile = profiles.find(x => x.profile === profile),
        len = profiles.length;

      if (foundProfile === undefined) {
        Log.info(chalk.red(`\nCannot find ${profile} profile`));
        return;
      }

      prompt.start();
      prompt.get(createInsertEdit, function (err, result) {
        if (err) {
          return self.ConfigManager.promptError(err);
        }

        let workingDirectory = self.config.basePath || process.cwd(),
          cartridges = self.ConfigManager.getCartridges(workingDirectory),
          newList = [];

        for (let i = 0; i < len; i++) {
          let currentProfile = profiles[i];

          if (currentProfile === foundProfile) {
            currentProfile.profile = result.hostname.split('-')[0];
            currentProfile.config = {
              hostname: result.hostname,
              username: result.username,
              password: result.password,
              cartridge: cartridges,
              codeVersion: result.codeversion,
              exclude: result.exclude.split(' ')
            };
          }

          newList.push(currentProfile);
        }

        self.ConfigManager.saveConfiguration(newList);

        Log.info(chalk.cyan(`\nSuccessfuly updated profile ${profile}`));
      });
    }

    /**
     * List all profiles from the configuration manager
     */
    listProfiles () {
      let profiles = this.ConfigManager.loadConfiguration().profiles,
        activeProfile = profiles.find(x => x.active === true),
        len = profiles.length,
        result;

      for (let i = 0; i < len; i++) {
        let currentProfile = profiles[i];

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
    switchProfile () {
      const self = this;
      
      let profile = self.config.name,
        profiles = self.ConfigManager.loadConfiguration().profiles,
        foundProfile = profiles.find(x => x.profile === profile),
        len = profiles.length,
        newList = [];
        
      if (foundProfile === undefined) {
        Log.info(chalk.red(`\nCannot find ${profile} profile.`));
        return;
      }

      for (let i = 0; i < len; i++) {
        let currentProfile = profiles[i];
        currentProfile.active = (currentProfile === foundProfile) ? true : false;
        newList.push(currentProfile);
      }

      self.ConfigManager.saveConfiguration(newList);

      Log.info(chalk.cyan(`\nSwitched to ${foundProfile.profile}. It is now your active profile.`));
    }
  }

  module.exports = ConfigEditor;
}());
