/*jshint esversion: 6 */
(function(){
	'use strict';

	//Constants
	const REQUEST_TIMEOUT = 15000,
		MAX_ATTEMPTS = 3,
		RETRY_DELAY = 300;

	const ERR_CODES = [
		'EADDRINFO',
		'ETIMEDOUT',
		'ECONNRESET',
		'ESOCKETTIMEDOUT',
		'ENOTFOUND',
		'EADDRNOTAVAIL',
		'ECONNREFUSED'
	];

	//Imports
	const configHelper = require('./config'),
		log = require('./logger'),

		fs = require('fs'),
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

	//require('request-debug')(request);

	/**
	 * A WebDav client realizing DELETE, PUT, UNZIP, MKCOL, PROPFIND
	 * @param {Object} config The configuration object used by Davos
	 */
	var WebDav = function(config) {

		//Initialize

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

		//Private

		function getUriPath(targetPath) {
			let i,
				previous,
				current,
				dirs = targetPath.split(path.sep),
				len = dirs.length;
			for (i = 0; i < len; i += 1) {
				current = dirs[i];
				if (current === 'cartridge') {
					break;
				}
				previous = current;
			}
			return '/' + targetPath.slice(targetPath.indexOf(previous));
		}

		function doRequest(options, path, attemptsLeft, retryDelay, reject, resolve, lastError) {
			var req = null,
				stream = null;

			if (attemptsLeft === MAX_ATTEMPTS) {
				options = Object.assign(options, baseOptions);
			}

			if (attemptsLeft <= 0) {
				reject((lastError !== null ? lastError : new Error('The request to ' + path + ' could not be processed!')));
			} else {

				if(!!path) {
					options.uri = getUriPath(path);
				}
				var signature = options.method + ' :: ' + options.uri
				req = request(options, function(error, response, body) {
					if(attemptsLeft < MAX_ATTEMPTS) {
						log.debug('Trying to ' + signature + ' for the ' + (MAX_ATTEMPTS - attemptsLeft) + ' time out of ' + MAX_ATTEMPTS + ' tries left.');
					}

					var e = null;
					if ((error && _.contains(ERR_CODES, error.code))) {
						log.error('Got ' + error.code + ' scheduling a retry after ' + retryDelay + 'ms');
						if (!!stream) {
							stream.close();
						}
						//abort current request
						req.abort();

						//schedule a retry
						setTimeout((function() {
							doRequest(options, path, --attemptsLeft, retryDelay, reject, resolve, e);
						}), retryDelay);

					} else if (!error && response.statusCode >= 400 && response.statusCode !== 404) {
						log.error( response.statusMessage + ' ' + response.statusCode + ". Could not " + signature + " :: skipping file.");
						e = new Error(response.statusMessage + ' ' + response.statusCode);
						e.code = response.statusCode;
						return reject(null);
					} else if (!error && (200 <= response.statusCode && response.statusCode < 300)) {
						log.debug('Succesfully actioned ' + path);
						return resolve(body);
					} else if (!!response && response.statusCode === 404 && options.method === 'DELETE') {
						log.info('File ' + options.uri + ' was not found, maybe already deleted.');
						return resolve(body);
					} else if (error) {
						e = new Error(error);
						e.code = error.code;
						return reject(e);
					} else {
						e = new Error('Unspecified error occurred...' + response.statusCode);
						e.code = response.statusCode;
						return reject(e);
					}
				});
				if (options.method === 'PUT') {
					try {
						stream = fs.createReadStream(path);
						stream.pipe(req);
						stream.on('end', function() {
								stream.close();
							});
					} catch (e) {
						log.error('There was an error reading the fs stream from ' + path + ' :: ' + e.code);
						return reject(e);
					}
				}
			}
		}

		//pass a refference to the parent
		var that = this;

		//Public
		return {
			delete: function(path) {
				return new Promise(function(resolve, reject) {
					var options = {
						method: 'DELETE'
					};
					doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
				});
			},
			mkcol: function(path) {
				return new Promise(function(resolve, reject) {
					var options = {
						method: 'MKCOL'
					};
					doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
				});
			},
			put: function(path) {
				return new Promise(function(resolve, reject) {
					var options = {
						method: 'PUT'
					};
					doRequest(options, path, MAX_ATTEMPTS, RETRY_DELAY, reject, resolve);
				});
			},
			unzip: function(path) {
				return new Promise(function(resolve, reject) {
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
				return new Promise(function(resolve, reject) {
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
