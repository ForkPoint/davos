(function () {
  'use strict';

  // Constants
  const MAX_ATTEMPTS = 3,
    RETRY_DELAY = 300;

  // Locals
  const ConfigManager = require('./config-manager'),
    RequestManager = require('./request-manager'),
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
        jar: true,
        ignoreErrors: true,
        followRedirect: true
      };

      this.reqMan = new RequestManager(this.options);

      return this;
    }

    doRequest (options, attemptsLeft, retryDelay, requestResolve, requestReject) {
      this.reqMan.doRequest(options, attemptsLeft, retryDelay, requestResolve, requestReject);
    }

    /**
     * HTTP Request BM LOGIN
     */
    bmLogin () {
      const self = this;

      return new Promise(function (loginResolve, loginReject) {
        let options = {
            uri: '/ViewApplication-ProcessLogin',
            form: {
                LoginForm_Login: self.config.username,
                LoginForm_Password: self.config.password,
                LoginForm_RegistrationDomain: 'Sites'
            }
        };
        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY, loginResolve, loginReject);
      });
    }

    /**
     * HTTP Request ACTIVATE CODE VERSION
     */
    activateCodeVersion () {
      const self = this;

      return new Promise(function (activateResolve, activateReject) {
        let options = {
            uri: '/ViewCodeDeployment-Activate',
            form: {
                CodeVersionID: self.conf.codeVersions
            }
        };
        self.doRequest(options, 'bm', MAX_ATTEMPTS, RETRY_DELAY, activateResolve, activateReject);
      });
    }
  }

  module.exports = BM;
}());
