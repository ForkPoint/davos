(function () {
  'use strict';

  module.exports = {
    Core: require('./src/main'),
    ConfigManager: require('./src/config-manager'),
    Logger: require('./src/logger'),
    BM: require('./src/bm'),
    WebDav: require('./src/webdav')
  };
}());
