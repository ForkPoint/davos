/** Modules */
const sfccCode = require('sfcc-ci').code;
const chalk = require('chalk');

/** Internal modules */
const Log = require('../logger');
const util = require('../util');

function ListCodeVersions(instance, token) {
    return new Promise((res, rej) => {
        sfccCode.list(instance, token, function(err, list) {
            let versions = [];
    
            if (err) {
                Log.error(err);
                rej(err);
                return;
            }
    
            versions = list.data;
    
            /** show the code versions */
            util.listCodeVersions(versions);
            res();
        });
    });
}

module.exports = ListCodeVersions;
