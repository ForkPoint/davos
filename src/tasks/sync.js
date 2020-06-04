const WebDav = require('../webdav');
const xmldoc = require('xmldoc');
const Log = require('../logger');

function sync(config) {
    let webdav = new WebDav(config); // webdav will be obsolete, should use sfcc-ci module
    let clearRemoteOnlyCartridges = (!config.delete) ? config.D : config.delete;

    if (!clearRemoteOnlyCartridges) clearRemoteOnlyCartridges = false;

    webdav.propfind()
        .then(function (res) {
            const doc = new xmldoc.XmlDocument(res);
            const responseNodes = doc.childrenNamed('response');
            const nodesLen = responseNodes.length;
            const cartridges = config.cartridge;

            let cartridgesOnServer = [];
            let localCartridges = [];
            let differentCartridges = [];

            for (let i = 0; i < nodesLen; i++) {
                if (i === 0) continue;

                cartridgesOnServer.push(responseNodes[i].valueWithPath('propstat.prop.displayname'));
            }

            cartridges.forEach(function (cartridge) {
                const arr = cartridge.split(path.sep);
                localCartridges.push(arr[arr.length - 1]);
            });

            for (let i = 0; i < cartridgesOnServer.length; i++) {
                const currentServerCartridge = cartridgesOnServer[i];

                if (!localCartridges.includes(currentServerCartridge)) differentCartridges.push(currentServerCartridge);
            }

            return new Promise(function (resolve, reject) {
                if (differentCartridges.length > 0) {
                    Log.info(`\nThere are cartridges on the server that do not exist in your local cartridges: ${chalk.cyan(differentCartridges)}`);

                    if (clearRemoteOnlyCartridges) {
                        Log.info(`Deleting cartridges ${differentCartridges}`);
                        resolve(differentCartridges);
                    } else {
                        reject(`Cartridges were not deleted`);
                    }
                } else {
                    reject(`\nThere is no defference between the cartridges on the server and your local cartridges`);
                }
            });
        }).then(function (res) {
            res.forEach(function (cartridge) {
                return webdav.delete(cartridge);
            });
        }).then(function () {
            Log.info('Cartridges were deleted');
        }).catch(function (err) {
            Log.info(err);
        });
}

module.exports = sync;
