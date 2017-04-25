(function () {
  'use strict';

  // Constants
  const MAX_ATTEMPTS = 3,
    RETRY_DELAY = 300,
    REQUEST_TIMEOUT = 15000;

  // Locals
  const ConfigManager = require('./config-manager'),
    RequestManager = require('./request-manager'),
    BMTools = require('./bm-tools'),
    Log = require('./logger');

  /**
   * A WebDav client realizing DELETE, PUT, UNZIP, MKCOL, PROPFIND
   * @param {Object} config The configuration object used by Davos
   */
  class BM {
    constructor (config, ConfigManagerInstance) {
      this.ConfigManager = ConfigManagerInstance || new ConfigManager();
      this.config = (Object.keys(this.ConfigManager.config).length === 0)
        ? this.ConfigManager.loadConfiguration().getActiveProfile(config)
        : this.ConfigManager.mergeConfiguration(config);

      this.bm = new BMTools();

      this.options = {
        baseUrl: 'https://' + this.config.hostname + '/on/demandware.store/Sites-Site/default',
        uri: '/',
        contentString: null,
        jar: true,
        ignoreErrors: true,
        followRedirect: true
      };

      this.reqMan = new RequestManager(this.options);

      return this;
    }

    doRequest (options, attemptsLeft, retryDelay) {
      return this.reqMan.doRequest(options, attemptsLeft, retryDelay)
        .then(function (body) {
          return Promise.resolve(body);
        }, function (err) {
          return Promise.reject(err);
        });
    }

    /**
     * HTTP Request BM LOGIN
     */
    login () {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
            uri: '/ViewApplication-ProcessLogin',
            form: {
                LoginForm_Login: self.config.username,
                LoginForm_Password: self.config.password,
                LoginForm_RegistrationDomain: 'Sites'
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
     * HTTP Request ACTIVATE CODE VERSION
     */
    activateCodeVersion () {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
            uri: '/ViewCodeDeployment-Activate',
            form: {
                CodeVersionID: self.conf.codeVersions
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

    uploadSitesArchive (path) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
            method: 'PUT',
            baseUrl: 'https://' + self.config.hostname + '/on/demandware.servlet/webdav/Sites/Impex/src/instance',
            uri: path,
            auth: {
              user: self.config.username,
              password: self.config.password
            },
            timeout: REQUEST_TIMEOUT
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
      });
    }

    deleteSitesArchive (path) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
            method: 'DELETE',
            baseUrl: 'https://' + self.config.hostname + '/on/demandware.servlet/webdav/Sites/Impex/src/instance',
            uri: path,
            contentString: null,
            auth: {
              user: self.config.username,
              password: self.config.password
            },
            timeout: REQUEST_TIMEOUT
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
      });
    }
  }

  module.exports = BM;
}());
