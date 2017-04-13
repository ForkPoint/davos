(function () {
  'use strict';

  // Constants
  const DEFAULT_CONFIG_NAME = 'davos.json',
    CONFIG_PROPERTIES = ['hostname', 'username', 'password', 'cartridge', 'codeVersion', 'exclude'],
    IGNORED_DIRECTORY_NAMES = ['.git', '.svn', '.sass-cache', 'node_modules'];

  // Imports
  const fs = require('fs'),
    walk = require('walk'),
    path = require('path'),
    Queue = require('sync-queue'),
    chalk = require('chalk');

  // Locals
  const log = require('./logger');

  const Config = function () {

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

    function getCartridges(srcPath) {
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

      fs.writeFileSync(configFileName, JSON.stringify(json, null, '  '), 'UTF-8');
      log.info(chalk.cyan('\n Configuration saved in ' + configFileName));
    }

    function promptError(e) {
      log.error(e);
      return 1;
    }

    return {
      IGNORED_DIRECTORY_NAMES,
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
