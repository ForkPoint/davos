/**
 * Modules
 */
const sfcc = require('sfcc-ci');
const chalk = require('chalk');

/**
 * Internal modules
 */
const DavosEvents = require('./davos_events').emitter;
const Log = require('./logger');

/**
 * SFCC Manager Class
 * 
 * TODO: Implement SFCC Related inquiries, which will, possibly, lead to removal of BM/WebDav/RequestManager scripts
 */
class SFCCManager {
    constructor(config) {
        this.config = config;
        this.token = '';

        this.Events();
    }

    Events() {
        DavosEvents.on('token:found', ({ token }) => {
            this.SetToken(token);
        });
    }

    SetToken(token) {
        this.token = token;
    }

    Authenticate() {
        const sfccAuth = sfcc.auth;
        const clientID = this.config['client-id'];
        const clientSecret = this.config['client-secret'];

        return new Promise((res, rej) => {
            sfccAuth.auth(clientID, clientSecret, function (err, token) {
                if (token) {
                    Log.info(`Authentication succeeded. Token is ${chalk.cyan(token)}`);

                    DavosEvents.emit('token:found', { token: token });
                    res();
                }
                if (err) {
                    Log.error(`Authentication error: ${err}`);

                    rej(err);
                }
            });
        });
    }
}

module.exports = SFCCManager;
