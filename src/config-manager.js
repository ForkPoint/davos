(function () {
  'use strict';

  // Constants
  const DEFAULT_CONFIG_NAME = 'davos.json',
    TMP_DIR = "tmp",
    CONFIG_PROPERTIES = {
      required: ['hostname', 'username', 'password', 'cartridge', 'codeVersion'],
      optional: ['exclude', 'templateReplace']
    },
    GLOB_IGNORED = [
      "**/.git/**",
      "**/.svn/**",
      "**/.sass-cache/**",
      "**/node_modules/**"
    ];

  // Imports
  const fs = require('fs'),
    globby = require('globby'),
    path = require('path'),
    chalk = require('chalk'),
    Queue = require('sync-queue');

  // Locals
  const Log = require('./logger');

  /** 
   * A configuration manager managing the input JSON
   */
  class ConfigManager {
    /**
     * Create a configuration manager
     */
    constructor() {
      /* contain all the profiles */
      this.profiles = [];
      /* contain active profile */
      this.config = {};
      return this;
    }

    /**
     * Gets the configuration file name
     * @return {String} The configuration file name
     */
    getConfigName() {
      // @TODO make config name dynamic
      // check files for structure that match config and get first one - if not - throws an error
      return DEFAULT_CONFIG_NAME;
    }

    /**
     * Gets the active profile from the configuration
     * @param {Object} config The configuration object used by Davos
     * @return {Object} The configuration object used by Davos
     */
    getActiveProfile(config) {
      if (!this.profiles) {
        Log.error(chalk.red(`\nCannot read configuration.`));
        return config;
      }

      let activeProfile = this.profiles.find(x => x.active === true);

      if (!activeProfile) {
        Log.error(chalk.red(`\nThere is no active profile in your configuration.`));
        return config;
      }

      this.config = activeProfile.config;

      if (config !== undefined) {
        this.mergeConfiguration(config);
      }

      this.validateConfigProperties(this.config);

      return this.config;
    }

    /**
     * Merge two configurations
     * @param {Object} config The configuration object used by Davos
     * @return {Object} The merged configuration object
     */
    mergeConfiguration(config) {
      this.config = Object.assign({}, this.config, config);
      return this.config;
    }

    /**
     * Check for existing configuration
     * @param {Object} config The configuration object used by Davos
     * @return {Boolean}
     */
    isConfigExisting() {
      let configName = this.getConfigName();

      try {
        fs.statSync(configName);
        return true;
      } catch (e) {
        return false;
      }
    }

    /**
     * Configuration object validator
     * @param {Object} config The configuration object used by Davos
     */
    validateConfigProperties(config) {
      CONFIG_PROPERTIES.required.forEach(function (property) {
        if (!config.hasOwnProperty(property)) {
          throw {
            name: 'InavlidConfiguration',
            message: `Your configuration profile does not contain ${property}`
          };
        }
      });
      CONFIG_PROPERTIES.optional.forEach(function (property) {
        if (!config.hasOwnProperty(property)) {
          Log.warn(`Your configuration profile does not contain optional property ${property}`);
        }
      });
    }

    /**
     * Gets all found cartridges
     * @param {String} currentRoot The root directory
     * @return {Array.<Object>} An array with all found cartridges
     */
    getCartridges(currentRoot) {
      let result = [];

      currentRoot = path.join(currentRoot, "/cartridges")

      let paths = globby.sync(['**/cartridge/'], {
        cwd: currentRoot,
        dot: true,
        nosort: true,
        absolute: true,
        ignore: GLOB_IGNORED
      });

      paths.forEach(function (filePath) {
        let absolutePath = filePath,
          relativeCartridgePath = path.relative(currentRoot, absolutePath),
          relativePath = path.dirname(relativeCartridgePath).replace(/\\/g, '/');

        result.push(relativePath);
      });

      return result;
    }

    /**
     * Gets all found cartridges
     * @return {String} The temp directory
     */
    getTempDir() {
      let dir = this.config.tmpDir || TMP_DIR;

      try {
        fs.mkdirSync(dir);
      } catch (e) {

      }

      return dir;
    }

    /**
     * Check for valid cartridge path
     * @param {String} relativePath The path where the cartridges are located
     * @return {Boolean}
     */
    isValidCartridgePath(relativePath) {
      const self = this;

      let validCartridge = false;

      self.config.cartridge.forEach(function (cartridge) {
        if (relativePath.startsWith(cartridge)) {
          validCartridge = true;
        }
      });

      return validCartridge;
    }

    /**
     * Load the configuration JSON from the file
     * @return {Object} The found configuration
     */
    loadConfiguration() {
      //parse the configuration
      let configName = this.getConfigName(),
        fileContents = '',
        json = null;

      try {
        fileContents = fs.readFileSync(configName, 'UTF-8');
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

    /**
     * Save the configuration JSON 
     * @param {Object} json The new configuration to be saved
     */
    saveConfiguration(json) {
      let configFileName = this.getConfigName();

      fs.writeFileSync(configFileName, JSON.stringify(json, null, '  '), 'UTF-8');
      Log.info(chalk.cyan('\n Configuration saved in ' + configFileName));
    }

    /**
     * Load the configuration JSON from the file
     * @param {Object} e The error to be logged
     * @return {Number}
     */
    promptError(e) {
      Log.error(e);
      return 1;
    }
  }

  module.exports = ConfigManager;
}());
