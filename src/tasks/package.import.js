'use strict'

/** Modules */
const path = require('path');
const glob = require('glob');
const fs = require('fs');

/** Internal modules */
const Log = require('../logger');

async function PackageImport(sfccManager, archiveName) {
    const root = process.cwd();
    const pathStr = `${root}/**/${archiveName}.zip`;
    const packagePath = glob.sync(pathStr)[0];
    const packageName = path.basename(packagePath);

    if (fs.existsSync(packagePath)) {
        await sfccManager.Upload(packagePath);
        await sfccManager.Import(packageName, packagePath);
    } else {
        Log.error(`${archiveName} does't exist. Please try again`);
    }
}

module.exports = PackageImport;
