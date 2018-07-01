(function () {
  'use strict';

  module.exports = {
    Core: require('./main'),
    ConfigManager: require('./config-manager'),
    Logger: require('./logger'),
    BM: require('./bm'),
    WebDav: require('./webdav')
  };
}());
