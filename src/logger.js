(function () {
  'use strict';

  // Imports
  const Logger = require('winston'),
    config = require('winston/lib/winston/config');

  Logger.addColors({
    debug: 'cyan',
    info: 'green',
    silly: 'magenta',
    warn: 'yellow',
    error: 'red'
  });

  Logger.remove(Logger.transports.Console);

  Logger.add(Logger.transports.Console, {
    level: 'verbose',
    colorize: 'all',
    handleExceptions: true,
    json: false,
    humanReadableUnhandledException: true,
    /*
    timestamp: function () {
      return new Date()
        .toISOString()
        .replace(/T/, ' ') // replace T with a space
        .replace(/\..+/, ''); // delete the dot and everything after
    },
		*/
    formatter: function (options) {
      // Return string will be passed to logger.
      let message = /* options.timestamp() + ' ' + */ (options.message ? options.message : '') + (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
      return config.colorize(options.level, message);
    }
  });

  Logger.exitOnError = function (err) {
    return err.code !== 'EPIPE';
  }

  module.exports = Logger;
})();
