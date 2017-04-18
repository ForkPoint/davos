(function () {
  'use strict';

  // Constants
  const REQUEST_TIMEOUT = 15000,
    MAX_ATTEMPTS = 3,
    RETRY_DELAY = 300,
    ERR_CODES = [
      'EADDRINFO',
      'ETIMEDOUT',
      'ECONNRESET',
      'ESOCKETTIMEDOUT',
      'ENOTFOUND',
      'EADDRNOTAVAIL',
      'ECONNREFUSED'
    ],
    REQUEST_DEFAULTS = {
      pool: {
        maxSockets: Infinity
      },
      strictSSL: false,
      agent: false,
      followRedirect: false,
      jar: false
    };

  // Imports
  const _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    request = require('request').defaults(REQUEST_DEFAULTS);

  // Locals
  const configHelper = require('./config'),
    log = require('./logger');

  /**
   * A WebDav client realizing DELETE, PUT, UNZIP, MKCOL, PROPFIND
   * @param {Object} config The configuration object used by Davos
   */
  class WebDav {
    constructor (config) {
      configHelper.validateConfigProperties(config);

      this.config = config;
      this.baseOptions = {
        baseUrl: 'https://' + config.hostname + '/on/demandware.servlet/webdav/Sites/Cartridges/' + config.codeVersion,
        uri: '/',
        auth: {
          user: config.username,
          password: config.password
        },
        timeout: REQUEST_TIMEOUT
      };

      return this;
    }

    // @TODO check why this methos has been used and remove/refactor if needed
    getUriPath (targetPath) {
      let dirs = targetPath.split(path.sep),
        len = dirs.length,
        previous;

      for (let i = 0; i < len; i++) {
        let current = dirs[i];

        if (current === 'cartridge') {
          break;
        }

        previous = current;
      }
      return '/' + targetPath.slice(0, targetPath.indexOf(previous) + previous.length);
    }

    doRequest (options, path, attemptsLeft, retryDelay, reject, resolve) {
      const self = this;

      let req = null,
        stream = null;

      if (attemptsLeft <= 0) {
        let e = new Error('The request to ' + path + ' could not be processed!');
        reject(e);
        return;
      }

      if (attemptsLeft === MAX_ATTEMPTS) {
        options = Object.assign(options, self.baseOptions);
      }

      if (path) {
        options.uri = path; // self.getUriPath(path);
      }

      let signature = options.method + ' :: ' + options.uri;

      req = request(options, function (error, response, body) {
        if (attemptsLeft < MAX_ATTEMPTS) {
          log.debug('Trying to ' + signature + ' for the ' + (MAX_ATTEMPTS - attemptsLeft) + ' time out of ' + MAX_ATTEMPTS + ' tries left.');
        }

        if (error && _.contains(ERR_CODES, error.code)) {
          log.error('Got ' + error.code + ' scheduling a retry after ' + retryDelay + 'ms');
          if (stream) {
            stream.close();
          }
          // abort current request
          req.abort();
          // schedule a retry
          setTimeout((function () {
            self.doRequest(options, path, --attemptsLeft, retryDelay, reject, resolve);
          }), retryDelay);
        } else if (!error && response.statusCode >= 400 && response.statusCode !== 404) {
          log.error( response.statusMessage + ' ' + response.statusCode + ". Could not " + signature + " :: skipping file.");

          let e = new Error(response.statusMessage + ' ' + response.statusCode);
          e.code = response.statusCode;
          reject(e); // Issue #18 - investigate reason for reject(null);
        } else if (!error && (200 <= response.statusCode && response.statusCode < 300)) {
          log.debug('Succesfully actioned ' + path);
          resolve(body);
        } else if (response && response.statusCode === 404 && options.method === 'DELETE') {
          log.info('File ' + options.uri + ' was not found, maybe already deleted.');
          resolve(body);
        } else if (error) {
          let e = new Error(error);
          e.code = error.code;
          reject(e);
        } else {
          let e = new Error('Unspecified error occurred...' + response.statusCode);
          e.code = response.statusCode;
          reject(e);
        }
      });

      if (options.method === 'PUT') {
        try {
          stream = fs.createReadStream(path);
          stream.pipe(req);
          stream.on('end', function () {
            stream.close();
          });
        } catch (e) {
          log.error('There was an error reading the fs stream from ' + path + ' :: ' + e.code);
          reject(e);
        }
      }
    }

    /**
     * HTTP Request LOGIN
     */
    login () {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options: {
            url: 'https://' + self.config.hostname + '/on/demandware.store/Sites-Site/default/ViewApplication-ProcessLogin',
            form: {
                LoginForm_Login: self.config.username,
                LoginForm_Password: self.config.password,
                LoginForm_RegistrationDomain: 'Sites'
            },
            jar: true,
            followRedirect: true,
            ignoreErrors: true
        };
        self.doRequest(options, null, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
      });
    }

    /**
     * HTTP Request ACTIVATE CODE VERSION
     */
    activateCodeVersion: {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options: {
            url: 'https://' + self.config.hostname + '/on/demandware.store/Sites-Site/default/ViewCodeDeployment-Activate',
            form: {
                CodeVersionID: self.config.codeVersion
            },
            jar: true
        };
        self.doRequest(options, null, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
      });
    }

    /**
     * WebDav DELETE
     */
    delete (path) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'DELETE'
        };
        self.doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
      });
    }

    /**
     * WebDav MKCOL
     */
    mkcol (path) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'MKCOL'
        };
        self.doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
      });
    }

    /**
     * WebDav PUT
     */
    put (path) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'PUT'
        };
        self.doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
      });
    }

    /**
     * WebDav UNZIP
     */
    unzip (path) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'POST',
          form: {
            method: 'UNZIP'
          }
        };
        self.doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
      });
    }

    /**
     * WebDav PROPFIND
     */
    propfind () {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'PROPFIND'
        };
        self.doRequest(options, null, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
      });
    }
  }

  module.exports = WebDav;
}());
