/*jshint esversion: 6 */
(function() {
	'use strict';

	var logger = require('winston');
	var config = require('winston/lib/winston/config');

	logger.addColors({
		debug: 'cyan',
		info: 'green',
		silly: 'magenta',
		warn: 'yellow',
		error: 'red'
	});

	logger.remove(logger.transports.Console);
	logger.add(logger.transports.Console, {
		level: 'verbose',
		colorize: 'all',
		handleExceptions: true,
      	json: false,
		humanReadableUnhandledException: true,
		/*timestamp: function() {
			return new Date().toISOString().
			replace(/T/, ' '). // replace T with a space
			replace(/\..+/, ''); // delete the dot and everything after
		},*/
		formatter: function(options) {
			// Return string will be passed to logger.
			var message = /* options.timestamp() + ' ' + */ (options.message ? options.message : '') +
				(options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
			return config.colorize(options.level, message);
		}
	});

	function ignoreEpipe(err) {
		return err.code !== 'EPIPE';
	}

	logger.exitOnError = ignoreEpipe;

	module.exports = logger;
})();
