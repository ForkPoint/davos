(function () {
  'use strict';

  // Constants
  const MAX_ATTEMPTS = 3,
    RETRY_DELAY = 3000,
    REQUEST_TIMEOUT = 60000;

  // Locals
  const ConfigManager = require('./config-manager'),
    RequestManager = require('./request-manager'),
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

      this.options = {
        baseUrl: 'https://' + this.config.hostname + '/on/demandware.servlet/webdav/Sites/Cartridges/' + this.config.codeVersion,
        uri: '/',
        contentString: null,
        auth: {
          user: this.config.username,
          password: this.config.password
        },
        timeout: REQUEST_TIMEOUT
      };

      this.reqMan = new RequestManager(this.options, this.ConfigManager);

      return this;
    }

  doRequest (options, attemptsLeft, retryDelay) {
      return this.reqMan.doRequest(options, attemptsLeft, retryDelay);
    }

    /**
     * WebDav DELETE
     */
    delete (path) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'DELETE',
          uri: path
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * WebDav MKCOL
     */
    mkcol (path) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'MKCOL',
          uri: path
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * WebDav GET CONTENT
     */
    getContent (path) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'GET',
          uri: path
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * WebDav PUT
     */
    put (path, options = {}) {
      const self = this;

      return new Promise(function (resolve, reject) {
        options = Object.assign({
          method: 'PUT',
          uri: path
        }, options);

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
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
          uri: path,
          contentString: content
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
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
          uri: path,
          form: {
            method: 'UNZIP'
          }
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
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

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function (body) {
            resolve(body);
          }, function (err) {
            reject(err);
          });
      });
    }
  }

  module.exports = WebDav;
}());
