'use strict';

/** Modules */
const sfccCode = require('sfcc-ci').code;
const chalk = require('chalk');

/** Internal modules */
const Log = require('../logger');
const util = require('../util');

function ListCodeVersions(instance, token) {
    return new Promise((res, rej) => {
        sfccCode.list(instance, token, (err, list) => {
            let versions = [];

            if (err) {
                rej(err);
                Log.error(err);
                return;
            }

            versions = list.data;

            /** show the code versions */
            util.listCodeVersions(versions);
            res();
        });
    }).catch(err => Log.error(`An error occurred while listing code versions : err`));
}

module.exports = ListCodeVersions;
