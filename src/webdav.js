(function () {
  'use strict';

  // Constants
  const MAX_ATTEMPTS = 3,
    RETRY_DELAY = 300,
    REQUEST_TIMEOUT = 15000;

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

      this.reqMan = new RequestManager(this.options);

      return this;
    }

    doRequest (options, attemptsLeft, retryDelay, requestResolve, requestReject) {
      this.reqMan.doRequest(options, attemptsLeft, retryDelay, requestResolve, requestReject);
    }

    /**
     * WebDav DELETE
     */
    delete (path) {
      const self = this;

      return new Promise(function (deleteResolve, deleteReject) {
        let options = {
          method: 'DELETE',
          uri: path
        };
        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY, deleteResolve, deleteReject);
      });
    }

    /**
     * WebDav MKCOL
     */
    mkcol (path) {
      const self = this;

      return new Promise(function (mkcolResolve, mkcolReject) {
        let options = {
          method: 'MKCOL',
          uri: path
        };
        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY, mkcolResolve, mkcolReject);
      });
    }

    /**
     * WebDav GET CONTENT
     */
    getContent (path) {
      const self = this;

      return new Promise(function (getContentResolve, getContentReject) {
        let options = {
          method: 'GET',
          uri: path
        };
        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY, getContentResolve, getContentReject);
      });
    }

    /**
     * WebDav PUT
     */
    put (path) {
      const self = this;

      return new Promise(function (putResolve, putReject) {
        let options = {
          method: 'PUT',
          uri: path
        };
        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY, putResolve, putReject);
      });
    }

    /**
     * WebDav PUT CONTENT
     */
    putContent (path, content) {
      const self = this;

      return new Promise(function (putContentResolve, putContentReject) {
        let options = {
          method: 'PUT',
          uri: path,
          contentString: content
        };
        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY, putContentResolve, putContentReject);
      });
    }

    /**
     * WebDav UNZIP
     */
    unzip (path) {
      const self = this;

      return new Promise(function (unzipResolve, unzipReject) {
        let options = {
          method: 'POST',
          uri: path,
          form: {
            method: 'UNZIP'
          }
        };
        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY, unzipResolve, unzipReject);
      });
    }

    /**
     * WebDav PROPFIND
     */
    propfind () {
      const self = this;

      return new Promise(function (propfindResolve, propfindReject) {
        let options = {
          method: 'PROPFIND'
        };
        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY, propfindResolve, propfindReject);
      });
    }
  }

  module.exports = WebDav;
}());
