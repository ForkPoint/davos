'use strict';

// Constants
const MAX_ATTEMPTS = 3,
  RETRY_DELAY = 3000,
  REQUEST_TIMEOUT = 60000;

// Locals
const RequestManager = require('./request-manager');
const Log = require('./logger');

/**
 * A WebDav client realizing DELETE, PUT, UNZIP, MKCOL, PROPFIND
 * @param {Object} config The configuration object used by Davos
 */
class WebDav {
  constructor (config) {
    this.config = config;
    this.options = {
      baseUrl: `https://${  this.config.hostname  }/on/demandware.servlet/webdav/Sites/Cartridges/${  this.config.codeVersion}`,
      uri: '/',
      contentString: null,
      auth: {
        user: this.config.username,
        password: this.config.password
      },
      timeout: REQUEST_TIMEOUT
    };

    this.reqMan = new RequestManager(this.options, this.config);

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

    return new Promise(((resolve, reject) => {
      const options = {
        method: 'DELETE',
        uri: path
      };

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then(() => {
          resolve();
        }, (err) => {
          reject(err);
        });
    })).catch(err => Log.error(err));
  }

  /**
   * WebDav MKCOL
   */
  mkcol (path) {
    const self = this;

    return new Promise(((resolve, reject) => {
      const options = {
        method: 'MKCOL',
        uri: path
      };

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then(() => {
          resolve();
        }, (err) => {
          reject(err);
        });
    })).catch(err => Log.error(err));
  }

  /**
   * WebDav GET CONTENT
   */
  getContent (path) {
    const self = this;

    return new Promise(((resolve, reject) => {
      const options = {
        method: 'GET',
        uri: path
      };

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then(() => {
          resolve();
        }, (err) => {
          reject(err);
        });
    })).catch(err => Log.error(err));
  }

  /**
   * WebDav PUT
   */
  put (path, options = {}) {
    const self = this;

    return new Promise(((resolve, reject) => {
      options = Object.assign({
        method: 'PUT',
        uri: path
      }, options);

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then(() => {
          resolve();
        }, (err) => {
          reject(err);
        });
    })).catch(err => Log.error(err));
  }

  /**
   * WebDav PUT CONTENT
   */
  putContent (path, content) {
    const self = this;

    return new Promise(((resolve, reject) => {
      const options = {
        method: 'PUT',
        uri: path,
        contentString: content
      };

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then(() => {
          resolve();
        }, (err) => {
          reject(err);
        });
    })).catch(err => Log.error(err));
  }

  /**
   * WebDav UNZIP
   */
  unzip (path) {
    const self = this;

    return new Promise(((resolve, reject) => {
      const options = {
        method: 'POST',
        uri: path,
        form: {
          method: 'UNZIP'
        }
      };

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then(() => {
          resolve();
        }, (err) => {
          reject(err);
        });
    })).catch(err => Log.error(err));
  }

  /**
   * WebDav PROPFIND
   */
  propfind () {
    const self = this;

    return new Promise(((resolve, reject) => {
      const options = {
        method: 'PROPFIND'
      };

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then((body) => {
          resolve(body);
        }, (err) => {
          reject(err);
        });
    })).catch(err => Log.error(err));
  }
}

module.exports = WebDav;
