#!/usr/bin/env node
/*jshint esversion: 6 */
process.env.UV_THREADPOOL_SIZE = 128;
(function(){
    'use strict';
    module.exports = require('./src/davos');
}());
