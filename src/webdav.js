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
    Readable = require('stream').Readable,
    request = require('request').defaults(REQUEST_DEFAULTS);

  // Locals
  const ConfigManager = require('./config-manager'),
    Log = require('./logger');

  /**
   * A WebDav client realizing DELETE, PUT, UNZIP, MKCOL, PROPFIND
   * @param {Object} config The configuration object used by Davos
   */
  class WebDav {
    constructor (config, ConfigManagerInstance) {
      this.ConfigManager = ConfigManagerInstance || new ConfigManager();
      this.config = (Object.keys(this.ConfigManager.config).length === 0)
        ? this.ConfigManager.loadConfiguration().getActiveProfile(config)
        : this.ConfigManager.mergeConfiguration(config);
      this.baseOptions = {
        baseUrl: 'https://' + this.config.hostname + '/on/demandware.servlet/webdav/Sites/Cartridges/' + this.config.codeVersion,
        uri: '/',
        auth: {
          user: this.config.username,
          password: this.config.password
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
          Log.debug('Trying to ' + signature + ' for the ' + (MAX_ATTEMPTS - attemptsLeft) + ' time out of ' + MAX_ATTEMPTS + ' tries left.');
        }

        if (error && _.contains(ERR_CODES, error.code)) {
          Log.error('Got ' + error.code + ' scheduling a retry after ' + retryDelay + 'ms');
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
          Log.error( response.statusMessage + ' ' + response.statusCode + ". Could not " + signature + " :: skipping file.");

          let e = new Error(response.statusMessage + ' ' + response.statusCode);
          e.code = response.statusCode;
          reject(e); // Issue #18 - investigate reason for reject(null);
        } else if (!error && (200 <= response.statusCode && response.statusCode < 300)) {
          Log.debug('Succesfully actioned ' + path);
          resolve(body);
        } else if (response && response.statusCode === 404 && options.method === 'DELETE') {
          Log.info('File ' + options.uri + ' was not found, maybe already deleted.');
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
          // create file stream (default)
          if (!options.hasOwnProperty('contentString')) {
            stream = fs.createReadStream(path);
          } else { // create string stream instead
            stream = new Readable;
            stream.push(options.contentString);
            stream.push(null);
          }
          stream.pipe(req);
          stream.on('end', function () {});
        } catch (e) {
          Log.error('There was an error reading the fs stream from ' + path + ' :: ' + e.code);
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
        let options = {
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
    activateCodeVersion () {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
            url: 'https://' + self.config.hostname + '/on/demandware.store/Sites-Site/default/ViewCodeDeployment-Activate',
            form: {
                CodeVersionID: self.conf.codeVersions
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
     * WebDav GET CONTENT
     */
    getContent (path) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'GET'
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
     * WebDav PUT CONTENT
     */
    putContent (path, content) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'PUT',
          contentString: content
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
