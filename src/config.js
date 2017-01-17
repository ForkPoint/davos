/*jshint esversion: 6 */
(function() {
    'use strict';
    const CONFIG_NAME = 'upload.json';

    var fs = require('fs'),
        chalk = require('chalk'),
        path = require('path'),
        log = require('./logger');


    let config = function() {
        let configPropeties = ['hostname', 'username', 'password', 'cartridge', 'codeVersion', 'exclude'];

        function loadConfiguration() {
            //parse the configuration
            let json = null;
            try {
                var fileContents = fs.readFileSync(CONFIG_NAME, 'UTF-8');
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

        function isConfigExisting() {
            try {
                fs.statSync(CONFIG_NAME);
                return true;
            } catch (e) {
                return false;
            }
        }

        function promptError(e) {
            log.error(e);
            return 1;
        }

        function validateConfigProperties(config) {
            configPropeties.forEach(function(property) {
                if (!config.hasOwnProperty(property)) {
                    throw {
                        name: 'InavlidConfiguration',
                        message: `Your configuration profile does not contain ${property}`
                    };
                }
            });
        }

        function getCartridges(srcpath, cartridges) {
            let i,
                directories = fs.readdirSync(srcpath),
                len = directories.length;
            for (i = 0; i < len; i += 1) {
                if (fs.statSync(path.join(srcpath, directories[i])).isDirectory()) {
                    if (directories[i] === 'cartridge') {
                        let relativePath = path.relative(process.cwd(), srcpath);
                        cartridges.push(relativePath);
                        continue;
                    } else {
                        getCartridges(`${srcpath}/${directories[i]}`, cartridges);
                    }
                }
            }
            return cartridges;
        }

        function getConfigName() {
        	//@TODO make config name dynamic
        	return CONFIG_NAME;
        }

        return {
        	getConfigName: getConfigName,
            isConfigExisting: isConfigExisting,
            loadConfiguration: loadConfiguration,
            saveConfiguration: saveConfiguration,
            getCartridges: getCartridges,
            promptError: promptError,
            validateConfigProperties: validateConfigProperties
        };
    }();
    module.exports = config;
}());
