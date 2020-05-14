const fs = require('fs');
const path = require('path');
const mockfs = require('mock-fs');
const { Paths: { OutputDir, InputMergeDir } } = require('../Constants');

function mockFileSystemForSplit() {
    mockfs({
        [path.join('test', 'files')]: {
            'some-file.xml': fs.readFileSync('test/files/test123.xml', 'UTF-8').toString()
        },
        [OutputDir]: {/** another empty directory */ },
        'resources': {
            'library.template': fs.readFileSync('resources/library.template', 'UTF-8').toString()
        }
    });
}

function mockFileSystemForMerge() {
    mockfs({
        'test/files': {
            'library.047-banners-hero-v1.xml': fs.readFileSync('test/files/library.047-banners-hero-v1.xml', 'UTF-8').toString(),
            'library.047-banners-hero-v2.xml': fs.readFileSync('test/files/library.047-banners-hero-v2.xml', 'UTF-8').toString()
        },
        [OutputDir]: {/** another empty directory */ },
        'resources': {
            'library.template': fs.readFileSync('resources/library.template', 'UTF-8').toString()
        }
    });
}

function mockFileSystemForUploadMetaWithoutConfigFile() {
    mockfs({
        'tmp': {},
        [OutputDir]: {/** another empty directory */ },
        'resources': {
            'library.template': fs.readFileSync('resources/library.template', 'UTF-8').toString()
        },
        'sites/site_template/meta': {
            'davos-meta-bundle.xml': fs.readFileSync('test/files/test123.xml', 'UTF-8').toString()
        }
    });
}

function mockFileSystemForUploadMetaWithConfigFile() {
    mockfs({
        'davos.json': fs.readFileSync('test/files/davos.json', 'UTF-8').toString(),
        'tmp': {},
        [OutputDir]: {/** another empty directory */ },
        'resources': {
            'library.template': fs.readFileSync('resources/library.template', 'UTF-8').toString()
        },
        'sites/site_template/meta': {
            'davos-meta-bundle.xml': fs.readFileSync('test/files/test123.xml', 'UTF-8').toString()
        }
    });
}

function mockFileSystemForUploadCartridgesWithConfigFile() {
    mockfs({
        'davos.json': fs.readFileSync('test/files/davos.json', 'UTF-8').toString(),
        'tmp': {},
        [OutputDir]: {/** another empty directory */ },
        'resources': {
            'library.template': fs.readFileSync('resources/library.template', 'UTF-8').toString()
        },
        'sites/site_template/meta': {
            'davos-meta-bundle.xml': fs.readFileSync('test/files/test123.xml', 'UTF-8').toString()
        },
        'app_storefront': {}
    });
}
function mockFileSystemForUploadCartridgesWithOutConfigFile() {
    mockfs({
        'tmp': {
            'cartriges_v1.zip': fs.readFileSync('test/files/test.zip', 'UTF-8').toString()
        },
        [OutputDir]: {/** another empty directory */ },
        'resources': {
            'library.template': fs.readFileSync('resources/library.template', 'UTF-8').toString()
        },
        'sites/site_template/meta': {
            'davos-meta-bundle.xml': fs.readFileSync('test/files/test123.xml', 'UTF-8').toString()
        },
        'app_storefront': {}
    });
}

module.exports = {
    mockFileSystemForSplit: mockFileSystemForSplit,
    mockFileSystemForMerge: mockFileSystemForMerge,
    mockFileSystemForUploadMetaWithoutConfigFile: mockFileSystemForUploadMetaWithoutConfigFile,
    mockFileSystemForUploadMetaWithConfigFile: mockFileSystemForUploadMetaWithConfigFile,
    mockFileSystemForUploadCartridgesWithConfigFile: mockFileSystemForUploadCartridgesWithConfigFile,
    mockFileSystemForUploadCartridgesWithOutConfigFile: mockFileSystemForUploadCartridgesWithOutConfigFile,
};
