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
    BMTools = require('./bm-tools'),
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

      this.bm = new BMTools();

      this.webdavOptions = {
        baseUrl: 'https://' + this.config.hostname + '/on/demandware.servlet/webdav/Sites/Cartridges/' + this.config.codeVersion,
        uri: '/',
        contentString: null,
        auth: {
          user: this.config.username,
          password: this.config.password
        },
        timeout: REQUEST_TIMEOUT
      },
      this.bmOptions = {
        baseUrl: 'https://' + this.config.hostname + '/on/demandware.store/Sites-Site/default',
        uri: '/',
        jar: true,
        ignoreErrors: true,
        followRedirect: true
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

    doRequest (options, requestType, attemptsLeft, retryDelay, requestReject, requestResolve) {
      const self = this;

      let req = null,
        stream = null,
        responseBody = null;

      if (attemptsLeft === MAX_ATTEMPTS) {
        switch (requestType) {
          case 'webdav': {
            options = Object.assign({}, self.webdavOptions, options);
            break;
          }
          case 'bm': {
            options = Object.assign({}, options, self.bmOptions);
            options.uri = self.bm.appendCSRF(options.uri);
            break;
          }
        }
      }

      if (attemptsLeft <= 0) {
        let e = new Error('The request to ' + options.uri + ' could not be processed!');
        return requestReject(e);
      }

      let signature = options.method + ' :: ' + options.uri;

      req = request(options, function (error, response, body) {
        if (attemptsLeft < MAX_ATTEMPTS) {
          Log.debug('Trying to ' + signature + ' for the ' + (MAX_ATTEMPTS - attemptsLeft) + ' time out of ' + MAX_ATTEMPTS + ' tries left.');
        }
        if (!error) {
          responseBody = body;

          if (requestType === 'bm') {
            self.bm.parseCsrfToken(body);
            self.bm.isAuth = self.bm.isLoggedIn(body);
          }

          if (options.method === 'PUT') {
            // see after req() body condition with === 'PUT'
          } else {
            requestResolve(body);
          }
        }
      }).on('response', function(response) {
        if (response.statusCode === 404) {
          let errorMessage = '';
          switch (options.method) {
            case 'GET': {
              errorMessage = 'Path ' + options.uri + ' was not found.';
              break;
            }
            case 'DELETE': {
              errorMessage = 'File ' + options.uri + ' was not found, maybe already deleted.';
              Log.info();
              break;
            }
          }
          if (errorMessage) {
            Log.info(errorMessage);
          }
          requestReject(new Error(errorMessage));
        } else if (response.statusCode >= 400) {
          let errorMessage = response.statusMessage + ' ' + response.statusCode + ". Could not " + signature + " :: skipping.";
          Log.error(errorMessage);
          requestReject(new Error(errorMessage));
        } else {
          Log.debug('Succesfully actioned ' + options.uri);
        }
      }).on('error', function (error) {
        let e = new Error('Error occurred...' + error.code);
        e.code = error.code;
        if (_.contains(ERR_CODES, error.code)) {
          Log.error('Got ' + error.code + ' scheduling a retry after ' + retryDelay + 'ms');
          // schedule a retry
          setTimeout((function () {
            self.doRequest(options, requestType, --attemptsLeft, retryDelay, requestReject, requestResolve);
          }), retryDelay);
          // terminate current stream (if any)
          if (stream) {
            stream.close();
          }
          // abort current request
          req.abort();
        } else {
          requestReject(e);
        }
      });

      if (options.method === 'PUT') {
        try {
          if (options.contentString) {
            // create string stream
            stream = new Readable;
            stream.push(options.contentString);
            stream.push(null);
          } else {
            // create file stream (default)
            stream = fs.createReadStream(options.uri);
          }
          stream.pipe(req);
          stream.on('end', function () {
            requestResolve(responseBody);
          });
        } catch (e) {
          let errComment = (options.contentString) ? 'options.contentString' : options.uri;
          Log.error('There was an error reading the stream from ' + errComment + ' :: ' + e.code);
          requestReject(e);
        }
      }
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
        self.doRequest(options, 'bm', MAX_ATTEMPTS, RETRY_DELAY, loginReject, loginResolve);
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
        self.doRequest(options, 'bm', MAX_ATTEMPTS, RETRY_DELAY, activateReject, activateResolve);
      });
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
        self.doRequest(options, 'webdav', MAX_ATTEMPTS, RETRY_DELAY, deleteReject, deleteResolve);
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
        self.doRequest(options, 'webdav', MAX_ATTEMPTS, RETRY_DELAY, mkcolReject, mkcolResolve);
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
        self.doRequest(options, 'webdav', MAX_ATTEMPTS, RETRY_DELAY, getContentReject, getContentResolve);
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
        self.doRequest(options, 'webdav', MAX_ATTEMPTS, RETRY_DELAY, putReject, putResolve);
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
        self.doRequest(options, 'webdav', MAX_ATTEMPTS, RETRY_DELAY, putContentReject, putContentResolve);
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
        self.doRequest(options, 'webdav', MAX_ATTEMPTS, RETRY_DELAY, unzipReject, unzipResolve);
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
        self.doRequest(options, 'webdav', MAX_ATTEMPTS, RETRY_DELAY, propfindReject, propfindResolve);
      });
    }
  }

  module.exports = WebDav;
}());
