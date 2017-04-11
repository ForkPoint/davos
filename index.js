#!/usr/bin/env node

process.env.UV_THREADPOOL_SIZE = 128;

(function () {
  'use strict';

  module.exports = {
    core: require('./src/davos'),
    config: require('./src/config'),
    logger: require('./src/logger'),
    webdav: require('./src/webdav')
  };
}());
