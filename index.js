#!/usr/bin/env node

process.env.UV_THREADPOOL_SIZE = 128;

try {
    var version = process.version;
    if( version.indexOf('v') === 0 ) version = version.substr(1);
        version = version.split('.');

    var majorVersion = version[0];
        majorVersion = parseInt(majorVersion);

    var minorVersion = version[1];
        minorVersion = parseInt(minorVersion);

    if( majorVersion < 8 || ( majorVersion === 8 && minorVersion < 5 ) )
        return console.error('Error: DAVOS requires Node.js v8.5 or higher to run. Please upgrade your Node.js version and try again.');

} catch( err ) {
    console.error('Failed to determine Node.js version, please make sure you\'re using version 8 or higher.');
}

require('./src/davos-cli.js');
