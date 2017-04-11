(function () {
  'use strict';

  // Constants
  const CONFIG_NAME = 'upload.json';

  // Imports
  const fs = require('fs'),
    chalk = require('chalk'),
    path = require('path');

  // Local dependencies
  const log = require('./logger');

  const Config = function () {
    const configPropeties = ['hostname', 'username', 'password', 'cartridge', 'codeVersion', 'exclude'];

    function getConfigName() {
      // @TODO make config name dynamic
      // check files for structure that match config and get first one - if not - throws an error
      return CONFIG_NAME;
    }

    function isConfigExisting() {
      try {
        fs.statSync(CONFIG_NAME);
        return true;
      } catch (e) {
        return false;
      }
    }

    function validateConfigProperties(config) {
      configPropeties.forEach(function (property) {
        if (!config.hasOwnProperty(property)) {
          throw {
            name: 'InavlidConfiguration',
            message: `Your configuration profile does not contain ${property}`
          };
        }
      });
    }

    function getCartridges(srcpath, cartridges) {
      const directories = fs.readdirSync(srcpath);
      const len = directories.length;

      for (let i = 0; i < len; i += 1) {
        if (fs.statSync(path.join(srcpath, directories[i])).isDirectory()) {
          if (directories[i] === 'cartridge') {
            const relativePath = path.relative(process.cwd(), srcpath);
            cartridges.push(relativePath);
            continue;
          }
          getCartridges(`${srcpath}/${directories[i]}`, cartridges);
        }
      }
      return cartridges;
    }

    function loadConfiguration() {
      //parse the configuration
      let json = null;
      try {
        const fileContents = fs.readFileSync(CONFIG_NAME, 'UTF-8');
        json = JSON.parse(fileContents);
      } catch (e) {
        log.error(chalk.red("\nThere was a problem parsing the configuration file : " + CONFIG_NAME + " ::: " + e.message));
      }
      return json;
    }

    function saveConfiguration(json) {
      fs.writeFileSync(CONFIG_NAME, JSON.stringify(json), 'UTF-8');
      log.info(chalk.cyan('\n Configuration saved in ' + CONFIG_NAME));
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
