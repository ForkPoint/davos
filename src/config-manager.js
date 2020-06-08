
'use strict';

/** Constants */
const Constants = require('./constants');

/** Modules */
const fs = require('fs');
const chalk = require('chalk');

/** Internal modules */
const Log = require('./logger');
const Profile = require('./profile');

/**
 * Class Config Manager
 * 
 * Represents a manager class to perform Operations on Profiles || Configurations
 */
class ConfigManager {
  constructor(config) {
    this.activeConfig = '';
    this.profiles = [];
    this.profileFactory(config);
  }

  /**
   * Creates profiles and sets up their configuration objects for ConfigManager
   * 
   * @param {object} Configuration object from the initialization of Davos 
   */
  profileFactory(config) {
    if (this.hasRequiredProperties(config)) {
      this.profiles.push(new Profile(config, true, 'default'));
    } else {
      this.setActiveConfig();
      const configFile = this.getConfigFile();
      
      if (!configFile) {
        /** create empty configuration */
        Log.warn('No configuration file present, creating empty configuration.');
        Log.warn('Limited functionality will be available.');
        
        this.profiles.push(new Profile({}, true, 'default'));
      } else {
        /** if array, then it is davos.json */
        if (Array.isArray(configFile)) {
          configFile.forEach((profile) => {
            const nonVitalConfigProperties = this.getNonVitalConfigProperties(profile.config);
            const newProfile = new Profile(profile.config, profile.active, profile.profile);

            this.addNonVitalConfigPropertiesToProfile(newProfile, nonVitalConfigProperties);
            this.profiles.push(newProfile);
          });
        } else {
          const nonVitalConfigProperties = this.getNonVitalConfigProperties(configFile);
          const newProfile = new Profile(configFile, true, 'default');

          this.addNonVitalConfigPropertiesToProfile(newProfile, nonVitalConfigProperties);
          this.profiles.push(newProfile);
        }
      }
    }
  }

  /**
   * Checks for the required properties
   * 
   * @param {object} Configuration object from initialization of Davos 
   */
  hasRequiredProperties(config) {
    if (!config) return false;

    const { required } = Constants.CONFIG_PROPERTIES;
    return Object.keys(config).filter((prop) => required.includes(prop)).length === required.length;
  }

  /**
   * Checks for the optional properties
   *
   * @param {object} Configuration object from initialization of Davos
   */
  hasOptionalProperties(config) {
    if (!config) return false;

    const { optional } = Constants.CONFIG_PROPERTIES;
    return Object.keys(config).filter((prop) => optional.includes(prop)).length > 0;
  }

  /**
   * Checks if a given property is an required one
   * 
   * @param {string} Property to check 
   */
  isRequiredProperty(property) {
    const { required } = Constants.CONFIG_PROPERTIES;
    return required.includes(property);
  }

  /**
   * Checks if a given property is an optional one
   *
   * @param {string} Property to check
   */
  isOptionalProperty(property) {
    const { optional } = Constants.CONFIG_PROPERTIES;
    return optional.includes(property);
  }

  /**
   * Returns an object, containing non-essential properties.
   * These might include:
   * [git], [pattern] etc...
   * 
   * @param {object} Configuration object from initialization of Davos
   */
  getNonVitalConfigProperties(config) {
    const nonVitalConfigProperties = {};

    if (!config) {
      return nonVitalConfigProperties;
    }

    Object.keys(config).forEach((key) => {
      if (!this.isRequiredProperty(key) && !this.isOptionalProperty(key)) {
        nonVitalConfigProperties[key] = config[key];
      }
    });

    return nonVitalConfigProperties;
  }

  addNonVitalConfigPropertiesToProfile(profile, nonVitalAttributes) {
    Object.keys(nonVitalAttributes).forEach(attr => profile.config.SetProperty(attr, nonVitalAttributes[attr]));
  }

  /**
   * Gets the current configuration file
   * 
   * NOTE: this will work, only if there is an existing configuration file (davos.json || dw.json)
   */
  getConfigFile() {
    const configName = this.getConfigName();
    let fileContents = '';
    let json = null;

    if (configName) {
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

      return json;
    } else {
      Log.warn('No configuration file present, please create either davos.json or dw.json');
      return null;
    }
  }

  /**
   * Checks if a certain configuration file exists in the main directory
   * davos.json || dw.json
   * 
   * @param {string} Filename 
   */
  checkConfigFile(filename) {
    try {
      return fs.existsSync(filename);
    } catch (err) {
      Log.error(err);
      Log.info(`${filename} not present`)
      return false;
    }
  }

  /**
   * Sets the active configuration name to the ConfigManager object
   * davos.json || dw.json
   * 
   * If none is present and an operation is required to have it, execution will end here.
   */
  setActiveConfig() {
    let configName = Constants.DEFAULT_CONFIG_NAME;
    let configExists = this.checkConfigFile(configName);

    if (!configExists) {
      configName = Constants.DW_CONFIG_NAME;
      configExists = this.checkConfigFile(configName);
    }

    if (configExists) {
      this.activeConfig = configName;
    }
  }

  /**
   * Return the current active configuration name
   * davos.json || dw.json
   */
  getConfigName() {
    return this.activeConfig;
  }

  /**
   * Returns the current active profile
   * If many are active, the first one will be returned
   */
  getActiveProfile() {
    const activeProfile = this.profiles.find(x => x.active === true);

    if (!activeProfile) {
      Log.error(chalk.red(`\nThere is no active profile in your configuration.`));
      throw new Error('No active profile');
    }

    return activeProfile;
  }

  /**
   * Gets the configuration from the current active profile
   */
  getActiveConfig() {
    return this.getActiveProfile().config;
  }

  // TODO: Perhaps remove, double check
  isConfigExisting() {
    let configName = this.getConfigName();

    try {
      fs.statSync(configName);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Saves a json configuration to the current active configuration file */
  saveConfiguration(json) {
    let configFileName = this.getConfigName();

    fs.writeFileSync(configFileName, JSON.stringify(json, null, '  '), 'UTF-8');
    Log.info(chalk.cyan('\n Configuration saved in ' + configFileName));
  }
}

module.exports = ConfigManager;
