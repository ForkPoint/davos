const sfccCode = require('sfcc-ci').code;
const Log = require('../logger');

function ListCodeVersions(instance, token) {
    sfccCode.list(instance, token, function(err, list) {
        if (err) {
            Log.error(err);
            return;
        }

        console.log(list);
    });
}

module.exports = ListCodeVersions;
