/** Modules */
const path = require('path');
const fs = require('fs');
const yazl = require('yazl');
const glob = require('glob');
const xmlParser = require('xml-js');
const extract = require('extract-zip');
const chalk = require('chalk');
const mergeWith = require('lodash/mergeWith');
const globby = require('globby');

/** Internal modules */
const utils = require('../util');
const Log = require('../logger');

/** Module constants */
const defaultSite = 'template';

function getPackageToPack(site) {
    const sitePrefix = 'site_';
    let siteToPack = site;
    
    if (!siteToPack) {
        siteToPack = `${sitePrefix}${defaultSite}`;
    } else {
        siteToPack = `${sitePrefix}${siteToPack}`;
    }
    
    return siteToPack;
}

function getPathToSite(site) {
    const cwd = utils.getCurrentRoot();
    return path.join(cwd, 'sites', site);
}

function createArchive(pathForArchiving, archiveName, outputPath, temp, additions) {
    const archive = new yazl.ZipFile();
    const root = utils.getCurrentRoot();
    const writeDir = temp ? `${root}/tmp/` : outputPath;
    const fileGlob = `sites/**/${path.basename(pathForArchiving)}/**/*`;
    const options = {
        cwd: root,
        ignore: []
    };
    const pathReplace = temp ? '' : archiveName.replace('.zip', '/');

    const skipCatalogs = propExists(additions, 'skipCatalogs') && additions.skipCatalogs;
    const skipImages = propExists(additions, 'skipImages') && additions.skipImages;
    const skipStores = propExists(additions, 'skipStores') && additions.skipStores;

    if (!temp) {
        options.ignore.push('**/__common*/**');
    }

    if (skipCatalogs === 'true') {
        options.ignore.push('**/catalogs*/**');
    }
    if (skipImages === 'true' && (!skipCatalogs || skipCatalogs === 'false')) options.ignore.push('**/catalogs/**/static*/**');
    if (skipStores === 'true') options.ignore.push('**/stores.xml');

    return new Promise(async (res, rej) => {
        await globby([fileGlob], options).then((paths) => {
            paths.forEach((filePath) => {
                const absolutePath = filePath;
                const relativePath = path.relative(root, absolutePath.replace('sites/', pathReplace));

                if (fs.lstatSync(absolutePath).isDirectory()) {
                    archive.addEmptyDirectory(relativePath);
                } else {
                    archive.addFile(absolutePath, relativePath);
                }
            });
        });

        if (!fs.existsSync(writeDir)) {
            fs.mkdirSync(writeDir, { recursive: true });
        }

        archive.end();
        archive.outputStream
            .pipe(fs.createWriteStream(writeDir + "/" + archiveName))
            .on('close', function () {
                Log.info(chalk.cyan(`${archiveName} created.`));
                res();
            });
    }).catch((err) => {
        Log.error(err);
    });
}

function mergePackagesWith(packagesPath, mergeWithPath) {
    const mergeWithFiles = glob.sync(`${mergeWithPath}/**/*`);
    const brandPaths = {};

    const paths = glob.sync(`${packagesPath}/*`)
       .filter(sitePath => sitePath.replace(/\\/g, '/').indexOf(mergeWithPath.replace(/\\/g, '/')) < 0);
    const pathsLength = paths.length;
    let i = 0;

    for (; i < pathsLength; i++) {
        const packagePath = paths[i];
        const brand = path.basename(packagePath).split(/(?=[A-Z])/)[0]
        const brandCommonPath = `${mergeWithPath}__${brand}`;
        const mergeWithFilesLength = mergeWithFiles.length;
        let j = 0;

        if (fs.existsSync(brandCommonPath)) {
            brandPaths[brand] = brandCommonPath;
        }

        for (; j < mergeWithFilesLength; j++) {
            const commonFile = mergeWithFiles[j];
            const stat = fs.statSync(commonFile);

            if (stat.isFile()) {
                const filePath = mergeWithPath.replace(/\\/g, '/');
                const siteFile = commonFile.replace(filePath, packagePath);
                const brandFile = commonFile.replace(filePath, brandCommonPath);

                const siteFileExists = fs.existsSync(siteFile);
                const brandFileExists = fs.existsSync(brandFile);

                if (commonFile.endsWith('.xml') && (brandFileExists || siteFileExists)) {
                    const commonFileContent = fs.readFileSync(commonFile);
                    const siteFileContent = siteFileExists && fs.readFileSync(siteFile);
                    const brandFileContent = brandFileExists && fs.readFileSync(brandFile);

                    const commonData = xmlParser.xml2json(commonFileContent, { compact: true, spaces: 4 });
                    const siteData = siteFileContent && xmlParser.xml2json(siteFileContent, { compact: true, spaces: 4 });
                    const brandData = brandFileContent && xmlParser.xml2json(brandFileContent, { compact: true, spaces: 4 });

                    const mergedData = mergeWith({}, JSON.parse(commonData), JSON.parse(brandData) || {}, JSON.parse(siteData) || {}, (objValue, srcValue) => {
                        if (Array.isArray(objValue) && Array.isArray(srcValue)) {
                            return objValue.concat(srcValue);
                        }
                        if (Array.isArray(objValue) && typeof srcValue === 'object') {
                            return objValue.concat([srcValue]);
                        }
                        if (Array.isArray(srcValue) && typeof objValue === 'object') {
                            return srcValue.concat([objValue]);
                        }

                        return undefined;
                    });

                    const dataContent = xmlParser.json2xml(mergedData, { compact: true, ignoreComment: true, spaces: 4 });

                    fs.mkdirSync(path.dirname(siteFile), { recursive: true });
                    fs.writeFileSync(siteFile, dataContent);
                } else {
                    fs.mkdirSync(path.dirname(siteFile), { recursive: true });
                    fs.copyFileSync(commonFile, siteFile);
                }
            }
        }
    }
}

function propExists(obj, prop) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, prop);
}

async function Pack(site, output, options) {
    const rootPath = utils.getCurrentRoot();
    const sitesPath = path.join(rootPath, 'sites');
    const tempDir = path.join(rootPath, 'tmp');

    const siteToPack = getPackageToPack(site);
    const backupArchive = `${siteToPack}_backup.zip`;
    const archiveName = `${siteToPack}_package.zip`;
    const backupPath = path.join(tempDir, backupArchive);
    const archivePath = output ?
        path.join(rootPath, output, archiveName) : path.join(sitesPath, archiveName);

    const pathToSite = getPathToSite(siteToPack);
    const pathToSiteSites = path.join(pathToSite, 'sites');
    const sitesCommonPath = path.join(pathToSiteSites, '__common');

    const skipCatalogs = propExists(options, 'skipCatalogs') && options.skipCatalogs === 'true';
    const skipImages = propExists(options, 'skipImages') && options.skipImages === 'true';
    const skipStores = propExists(options, 'skipStores') && options.skipStores === 'true';

    /** Create backup archive first */
    Log.info('Creating backup archive...');
    await createArchive(pathToSite, backupArchive, null, true, options);

    Log.info('Merging packages...');

    if (fs.existsSync(sitesCommonPath)) {
        mergePackagesWith(pathToSiteSites, sitesCommonPath);
    }

    if (skipCatalogs) {
        fs.rmdirSync(path.join(pathToSite, 'catalogs'), { recursive: true });
    }

    if (skipImages && !skipCatalogs) {
        fs.rmdirSync(path.join(pathToSite, 'catalogs/**/static'), { recursive: true });
    }

    if (skipStores) {
        fs.rmdirSync(path.join(pathToSite, 'sites/**/stores.xml'), { recursive: true });
    }

    Log.info('Packages merged');

    Log.info('Creating package archive...');

    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
    await createArchive(pathToSite, archiveName, output ? path.join(rootPath, output) : sitesPath, false);

    /**
     * If the archive is successfully created
     * Restore the previous state
     */
    Log.info('Attempting to restore previous state and remove backup archive...');

    if (fs.existsSync(archivePath)) {
        try {

            fs.rmdirSync(pathToSite, { recursive: true });
            await extract(backupPath, { dir: sitesPath });
            Log.info('Restored previous state');

            fs.unlinkSync(backupPath);
            Log.info('Removed the backup archive');
            Log.info('Packed!');
        } catch(err) {
            if (fs.existsSync(backupPath)) {
                Log.error('Could not delete the backup archive');
            }

            Log.error(err);
        }
    }
}

module.exports = Pack;
