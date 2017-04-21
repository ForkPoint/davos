#!/usr/bin/env node

process.env.UV_THREADPOOL_SIZE = 128;

(function () {
  'use strict';

  module.exports = {
    Core: require('./src/davos'),
    ConfigManager: require('./src/config-manager'),
    Logger: require('./src/logger'),
    WebDav: require('./src/webdav'),
    BMTools: require('./src/bm-tools')
  };
}());
