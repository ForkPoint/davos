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

        return {
            getCartridges: getCartridges,
            validateConfigProperties: validateConfigProperties
        };
    }();
    module.exports = config;
}());
