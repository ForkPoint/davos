(function () {
  'use strict';

  // Constants
  const DEFAULT_CONFIG_NAME = 'davos.json',
    CONFIG_PROPERTIES = ['hostname', 'username', 'password', 'cartridge', 'codeVersion', 'exclude'],
    // @TODO add these into default config ignore path
    IGNORED_DIRECTORY_NAMES = ['.git', '.svn', '.sass-cache', 'node_modules'];

  // Imports
  const fs = require('fs'),
    walk = require('walk'),
    path = require('path'),
    chalk = require('chalk');

  // Locals
  const Log = require('./logger');

  class ConfigManager {
    constructor () {
      /* contain all the profiles */
      this.profiles = [];
      /* contain active profile */
      this.config = {};
      return this;
    }

    getIgnoredPaths () {
      return IGNORED_DIRECTORY_NAMES;
    }

    getConfigName () {
      // @TODO make config name dynamic
      // check files for structure that match config and get first one - if not - throws an error
      return DEFAULT_CONFIG_NAME;
    }

    getProfiles() {
      return this.profiles;
    }

    getActiveProfie (config) {
      if (!this.profiles) {
        Log.error(chalk.red(`\nCannot read configuration.`));
        return config;
      }

      let activeProfile = this.profiles.find(x => x.active === true);

      if (!activeProfile) {
        Log.error(chalk.red(`\nThere is no active profile in your configuration [${configPath}].`));
        return config;
      }

      this.config = activeProfile.config;

      if (config !== undefined) {
        this.config = Object.assign(this.config, config);
      }

      return this.config;
    }

    isConfigExisting () {
      let configName = this.getConfigName();

      try {
        fs.statSync(configName);
        return true;
      } catch (e) {
        return false;
      }
    }

    validateConfigProperties (config) {
      CONFIG_PROPERTIES.forEach(function (property) {
        if (!config.hasOwnProperty(property)) {
          throw {
            name: 'InavlidConfiguration',
            message: `Your configuration profile does not contain ${property}`
          };
        }
      });
    }

    getCartridges (srcPath) {
      let result = [];

      walk.walkSync(srcPath, {
        filters: IGNORED_DIRECTORY_NAMES,
        listeners: {
          names: function (root, nodeNamesArray) {
            nodeNamesArray.sort(function (a, b) {
              if (a > b) return -1;
              if (a < b) return 1;
              return 0;
            });
          },
          directories: function (root, dirStatsArray, next) {
            let dirName = path.basename(root),
              absolutePath = path.dirname(root),
              relativePath = path.relative(srcPath, absolutePath);

            if (dirName === 'cartridge') {
              result.push(relativePath);
            }

            next();
          }
        }
      });

      return result;
    }

    isValidCartridgePath (relativePath, cartridges) {
      let validCartridge = false;

      cartridges.forEach(function (cartridge) {
        if (relativePath.startsWith(cartridge)) {
          validCartridge = true;
        }
      });

      return validCartridge;
    }

    loadConfiguration () {
      //parse the configuration
      let configName = this.getConfigName(),
        json = null;

      try {
        const fileContents = fs.readFileSync(configName, 'UTF-8');
      } catch (e) {
        Log.error(chalk.red("\nConfiguration not found. Error: " + configName + " ::: " + e.message));
      }

      try {
        json = JSON.parse(fileContents);
      } catch (e) {
        Log.error(chalk.red("\nThere was a problem parsing the configuration file : " + configName + " ::: " + e.message));
      }

      this.profiles = json;

      return this;
    }

    saveConfiguration (json) {
      let configFileName = this.getConfigName();

      fs.writeFileSync(configFileName, JSON.stringify(json, null, '  '), 'UTF-8');
      Log.info(chalk.cyan('\n Configuration saved in ' + configFileName));
    }

    promptError (e) {
      Log.error(e);
      return 1;
    }
  };

  module.exports = ConfigManager;
}());
