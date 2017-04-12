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
    ];

  // Imports
  const fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    request = require('request').defaults({
      pool: {
        maxSockets: Infinity
      },
      strictSSL: false,
      agent: false,
      followRedirect: false,
      jar: false
    });

  // Locals
  const configHelper = require('./config'),
    log = require('./logger');

  /**
   * A WebDav client realizing DELETE, PUT, UNZIP, MKCOL, PROPFIND
   * @param {Object} config The configuration object used by Davos
   */
  var WebDav = function(config) {

    configHelper.validateConfigProperties(config);

    const baseOptions = {
      baseUrl: 'https://' + config.hostname + '/on/demandware.servlet/webdav/Sites/Cartridges/' + config.codeVersion,
      uri: '/',
      auth: {
        user: config.username,
        password: config.password
      },
      timeout: REQUEST_TIMEOUT
    };

    function getUriPath(targetPath) {
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
      return '/' + targetPath.slice(targetPath.indexOf(previous));
    }

    function doRequest(options, path, attemptsLeft, retryDelay, reject, resolve, lastError) {
      let req = null,
        stream = null;

      if (attemptsLeft <= 0) {
        let e = (lastError !== null ? lastError : new Error('The request to ' + path + ' could not be processed!'));
        reject(e);
        return;
      }

      if (attemptsLeft === MAX_ATTEMPTS) {
        options = Object.assign(options, baseOptions);
      }

      if (path) {
        options.uri = getUriPath(path);
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
            doRequest(options, path, --attemptsLeft, retryDelay, reject, resolve, e);
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

    //Public
    return {
      delete: function(path) {
        return new Promise(function (resolve, reject) {
          var options = {
            method: 'DELETE'
          };
          doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
        });
      },
      mkcol: function(path) {
        return new Promise(function (resolve, reject) {
          var options = {
            method: 'MKCOL'
          };
          doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
        });
      },
      put: function(path) {
        return new Promise(function (resolve, reject) {
          var options = {
            method: 'PUT'
          };
          doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
        });
      },
      unzip: function(path) {
        return new Promise(function (resolve, reject) {
          var options = {
            method: 'POST',
            form: {
              method: 'UNZIP'
            }
          };
          doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
        });
      },
      propfind: function() {
        return new Promise(function (resolve, reject) {
          var options = {
            method: 'PROPFIND'
          };
          doRequest(options, null, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
        });
      }
    };
  };

  module.exports = function(configuration) {
    return new WebDav(configuration);
  };
}());
