(function () {
  'use strict';

  // Constants
  const MAX_ATTEMPTS = 3,
    RETRY_DELAY = 300,
    REQUEST_TIMEOUT = 15000;

  // Imports
  const request = require('request');

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

      this.options = {
        method: 'POST',
        baseUrl: 'https://' + this.config.hostname + '/on/demandware.store/Sites-Site/default',
        uri: '/',
        contentString: null,
        jar: request.jar(),
        ignoreErrors: true,
        followAllRedirects: true
      };

      this.bmTools = new BMTools();
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
          .then(function (body) {
            if (!self.bmTools.isLoggedIn(body)) {
              let e = new Error('Not able to login into business manager.')
              return reject(e);
            }

            self.bmTools.parseCsrfToken(body);

            resolve(body);
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * HTTP Request BM ENSURE NO IMPORT
     */
    ensureNoImport (archiveName) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
            uri: self.bmTools.appendCSRF('/ViewSiteImpex-Status')
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function (body) {
            if (!self.bmTools.isLoggedIn(body)) {
              let e = new Error('Not authenticated.');
              return reject(e);
            }

            self.bmTools.parseCsrfToken(body);

            let job = self.bmTools.parseBody(body, {
              archiveName: archiveName,
              selector: '#unitSelection ~ table:nth-of-type(3)',
              processLabel: 'Site Import ({0})'
            });

            if (job && job.isRunning) {
                let e = new Error('Import already running! Duration: ' + job.duration);
                return reject(e);
            }

            resolve(body);
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * HTTP Request BM IMPORT SITES
     */
    importSites (archiveName) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
            uri: self.bmTools.appendCSRF('/ViewSiteImpex-Dispatch'),
            form: {
                ImportFileName: archiveName,
                import: 'OK',
                realmUse: 'false'
            }
        };

        if (archiveName === undefined || archiveName.length < 1) {
          let e = new Error('Invalid archive name.');
          return reject(e);
        }

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function (body) {
            if (!self.bmTools.isLoggedIn(body)) {
              let e = new Error('Not authenticated.');
              return reject(e);
            }

            self.bmTools.parseCsrfToken(body);

            resolve(body);
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * HTTP Request BM CHECK IMPORT PROGRESS
     */
    checkImportProgress (archiveName) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
            uri: self.bmTools.appendCSRF('/ViewSiteImpex-Status')
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function (body) {
            if (!self.bmTools.isLoggedIn(body)) {
              let e = new Error('Not authenticated.');
              return reject(e);
            }

            self.bmTools.parseCsrfToken(body);

            let job = self.bmTools.parseBody(body, {
              archiveName: archiveName,
              selector: '#unitSelection ~ table:nth-of-type(3)',
              processLabel: 'Site Import ({0})'
            });

            if (!job) {
                let e = new Error('Could not find import job.');
                return reject(e);
            }

            resolve(body);
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

    /**
     * WebDav Request Upload Sites Meta
     */
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
            jar: false,
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

    /**
     * WebDav Request Delete Sites Meta
     */
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
            jar: false,
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
