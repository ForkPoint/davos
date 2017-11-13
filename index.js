#!/usr/bin/env node

process.env.UV_THREADPOOL_SIZE = 128;

(function () {
  'use strict';

  module.exports = {
    Core: require('./src/davos'),
    ConfigManager: require('./src/config-manager'),
    Logger: require('./src/logger'),
    BM: require('./src/bm'),
    WebDav: require('./src/webdav')
  };
}());
