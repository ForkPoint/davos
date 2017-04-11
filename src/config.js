(function () {
  'use strict';

  // Imports
  const fs = require('fs'),
    chalk = require('chalk'),
    path = require('path');

  // Locals
  const log = require('./logger');

  const Config = function () {

    const DEFAULT_CONFIG_NAME = 'upload.json',
      CONFIG_PROPERTIES = ['hostname', 'username', 'password', 'cartridge', 'codeVersion', 'exclude'],
      IGNORED_DIRECTORY_NAMES = ['.git', '.svn', '.sass-cache', 'node_modules'];

    function getConfigName() {
      // @TODO make config name dynamic
      // check files for structure that match config and get first one - if not - throws an error
      return DEFAULT_CONFIG_NAME;
    }

    function isConfigExisting() {
      let configName = this.getConfigName();

      try {
        fs.statSync(configName);
        return true;
      } catch (e) {
        return false;
      }
    }

    function validateConfigProperties(config) {
      CONFIG_PROPERTIES.forEach(function (property) {
        if (!config.hasOwnProperty(property)) {
          throw {
            name: 'InavlidConfiguration',
            message: `Your configuration profile does not contain ${property}`
          };
        }
      });
    }

    function getCartridges(srcpath, cartridges) {
      const directories = fs.readdirSync(srcpath),
        len = directories.length;

      for (let i = 0; i < len; i++) {
        let fsName = directories[i],
          fsPath = path.join(srcpath, fsName);

        if (IGNORED_DIRECTORY_NAMES.indexOf(fsName) > -1) {
          continue;
        }

        if (fs.statSync(fsPath).isDirectory()) {
          if (fsName === 'cartridge') {
            cartridges.push(path.relative(process.cwd(), srcpath));
            continue;
          }
          getCartridges(`${srcpath}/${fsName}`, cartridges);
        }
      }

      return cartridges;
    }

    function loadConfiguration() {
      //parse the configuration
      let configName = this.getConfigName(),
        json = null;

      try {
        const fileContents = fs.readFileSync(configName, 'UTF-8');
        json = JSON.parse(fileContents);
      } catch (e) {
        log.error(chalk.red("\nThere was a problem parsing the configuration file : " + configName + " ::: " + e.message));
      }

      return json;
    }

    function saveConfiguration(json) {
      let configFileName = this.getConfigName();

      fs.writeFileSync(configFileName, JSON.stringify(json), 'UTF-8');
      log.info(chalk.cyan('\n Configuration saved in ' + configFileName));
    }

    function promptError(e) {
      log.error(e);
      return 1;
    }

    return {
      getConfigName,
      isConfigExisting,
      validateConfigProperties,
      getCartridges,
      loadConfiguration,
      saveConfiguration,
      promptError
    };
  }();

  module.exports = Config;
}());
