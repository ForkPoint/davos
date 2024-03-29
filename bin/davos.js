#!/usr/bin/env node

process.env.UV_THREADPOOL_SIZE = 128;

try {
    let version = process.version;
    if( version.indexOf('v') === 0 ) version = version.substr(1);
        version = version.split('.');

    let majorVersion = version[0];
        majorVersion = parseInt(majorVersion);

    let minorVersion = version[1];
        minorVersion = parseInt(minorVersion);

    if( majorVersion < 12 || ( majorVersion === 12 && minorVersion < 11 ) )
        return console.error('Error: DAVOS requires Node.js v12.11 or higher to run. Please upgrade your Node.js version and try again.');

} catch( err ) {
    console.error('Failed to determine Node.js version, please make sure you\'re using version 12 or higher.');
}

require('../src/cli');
