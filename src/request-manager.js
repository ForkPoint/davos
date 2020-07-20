'use strict';

/** Constants */
const MAX_ATTEMPTS = 3;
const ERR_CODES = [
    'EADDRINFO',
    'ETIMEDOUT',
    'ECONNRESET',
    'ESOCKETTIMEDOUT',
    'ENOTFOUND',
    'EADDRNOTAVAIL',
    'ECONNREFUSED'
  ];
const REQUEST_DEFAULTS = {
    strictSSL: false,
    forever: true,
    agent: false,
    pool: false,
    followRedirect: false,
    jar: false
  };

/** Modules */
const _ = require('underscore');
const fs = require('fs');
const {Readable} = require('stream');
const request = require('request').defaults(REQUEST_DEFAULTS);

/** Internal modules */
const Log = require('./logger');
const util = require('./util');

class RequestManager {
  constructor (options, config) {
    this.options = options;
    this.config = config;
    return this;
  }

  doRequest (options, attemptsLeft, retryDelay, cb) {
    const self = this;
    let req = null;
    let stream = null;
    let responseBody = null;

    if (attemptsLeft === MAX_ATTEMPTS) {
      options = Object.assign({}, self.options, options);
    }

    return new Promise(((resolve, reject) => {
      const signature = `${options.method  } :: ${  options.uri}`;
      let url;

      if (attemptsLeft < 0) {
        const errorMessage = `The request to ${  options.uri  } could not be processed!`,
          e = new Error(errorMessage);
        Log.error(errorMessage);
        return reject(e);
      }

      options.headers = options.headers || {};
      url = require('url').parse(options.baseUrl);
      options.headers.Origin = `${url.protocol  }//${  url.hostname}`;

      req = request(options, (error, response, body) => {
        if (attemptsLeft < MAX_ATTEMPTS) {
          Log.error(`Trying to ${  signature  } for the ${  MAX_ATTEMPTS - attemptsLeft  } time out of ${  MAX_ATTEMPTS  } tries left.`);
        }
        if (!error) {
          responseBody = body;

          resolve(body);
        }
      }).on('response', (response) => {
        if (response.statusCode === 404) {
          let errorMessage = `Status code: ${  response.statusCode}`;
          switch (options.method) {
            case 'GET': {
              errorMessage = `Path ${  options.uri  } was not found.`;
              break;
            }
            case 'DELETE': {
              errorMessage = `File ${  options.uri  } was not found, maybe already deleted.`;
              break;
            }
          }
          const e = new Error(errorMessage);
          e.code = response.statusCode;
          Log.error(errorMessage);
          reject(e);
        } else if (response.statusCode >= 400) {
          Log.error(`${response.statusMessage  } ${  response.statusCode  }. Could not ${  signature  } :: skipping.`);
          resolve();
        } else {
          Log.debug(`Succesfully actioned ${  options.uri}`);
          if (cb) {
            cb(response);
          }
        }
      }).on('error', (error) => {
        const e = new Error(`Error occurred...${  error.code}`);
        e.code = error.code;
        if (_.contains(ERR_CODES, error.code)) {
          Log.error(`Got ${  error.code  } scheduling a retry after ${  retryDelay/1000  }s`);
          (function () {
            return new Promise(((retryResolve, retryReject) => {
              setTimeout(() => {
                retryResolve();
              }, retryDelay);
            }));
          })().then(() => {
            return self.doRequest(options, --attemptsLeft, retryDelay);
          }).then((body) => {
            resolve(body);
          }, (err) => {
            reject(err);
          });
          // terminate current stream (if any)
          if (stream) {
            stream.close();
          }
          // abort current request
          if (cb) {
            cb(error);
          }
          req.abort();
        } else {
          if (cb) {
            cb(error);
          }
          reject(e);
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
            stream = fs.createReadStream((options.fromTmpDir ? (`${util.getTempDir(self.config)  }/`) : 'cartridges/') + options.uri);
          }
          stream.pipe(req);
        } catch (e) {
          const errComment = (options.contentString) ? 'options.contentString' : options.uri;
          Log.error(`There was an error reading the stream from ${  errComment  } :: ${  e.code}`);
          reject(e);
        }
      }
    })).catch(err => Log.error(err));
  }
}

module.exports = RequestManager;

