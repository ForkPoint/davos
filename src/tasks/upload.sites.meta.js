'use strict';

/** Modules */
const path = require('path');

/** Internal modules */
const utils = require('../util');
const Constants = require('../constants');

async function uploadSitesMeta(arrayWithGlob, config, sfccMgr) {
    const root = utils.getCurrentRoot();
    const currentRoot = root + Constants.SITES_META_FOLDER;
    const archiveName = `sites_${config.codeVersion}.zip`;
    const tempDir = utils.getTempDir(config);
    const rootPrefix = `${path.basename(archiveName, '.zip')  }/`;
    const filePath = `${root}/${tempDir}/${archiveName}`;
    const glob = arrayWithGlob ? [`**/${arrayWithGlob}.xml`] : ['**/*.xml'];

    /** Create archive */
    await utils.compress(currentRoot, archiveName, glob, rootPrefix, config);
    /** Upload the file */
    await sfccMgr.Upload(filePath);
    /** Import the file */
    await sfccMgr.Import(archiveName, filePath);
}

module.exports = uploadSitesMeta;
