const Davos = require('../index');
const expect = require('chai').expect;
const mockfs = require('mock-fs');
const fs = require('fs');
const path = require('path');
const Log = require('../src/logger');
const outputDir = 'some/other/path/';
const inputDirAndFile = 'test/files/some-file.xml';
const inputDirForMerge = 'test/files/';
const outputDirMerge = 'some/other/path/myTest.xml';
const sandbox = require('sinon').createSandbox();
const BM = require('../src/bm');
WebDav = require('../src/webdav')

describe('Meta Split', function () {

    afterEach(function () {
        mockfs.restore();
        sandbox.restore();
    });

    it('should split meta file on CLI', async function () {
        mockFileSystemForSplit();
        const params = { command: { in: inputDirAndFile, out: outputDir } };
        await new Davos.Core(params).split();
        verifyFileSplitted();
    });

    it('should split meta file with gulp', async function () {
        mockFileSystemForSplit();
        await new Davos.Core().split(inputDirAndFile, outputDir);
        verifyFileSplitted();
    });

    it('should log error file when folder does not exist', async function () {
        mockFileSystemForSplit();
        let logSpy = sandbox.spy(Log, 'error');
        let res = await new Davos.Core().split(inputDirAndFile, outputDir + 'test');
        expect(res).to.be.false;
        expect(logSpy.callCount).to.equal(1);
    });

    it('should create new folder with --force if it does not exists', async function () {
        mockFileSystemForSplit();
        const newDir = 'test';
        const params = { command: { in: inputDirAndFile, out: outputDir + newDir, force: true } };
        await new Davos.Core(params, false).split();
        let files = fs.readdirSync(outputDir);
        expect(files.indexOf(newDir)).not.equal(-1);
    });

    it('should log erro if params in and out not provided', async function () {
        const params = { command: {} };
        let logSpy = sandbox.spy(Log, 'error');
        let res = await new Davos.Core(params, false).split();
        expect(res).to.be.false;
        expect(logSpy.callCount).to.equal(1);
        logSpy.restore()
    });

});

describe('Meta Merge', function () {

    afterEach(function () {
        mockfs.restore();
        sandbox.restore();
    });

    it('should merge meta file on CLI', async function () {
        mockFileSystemForMerge();
        const params = { command: { in: inputDirForMerge, out: outputDirMerge } };
        await new Davos.Core(params).merge();
        verifyFilesMerged();
    });

    it('should merge meta file on gulp', async function () {
        mockFileSystemForMerge();
        await new Davos.Core().merge(inputDirForMerge, outputDirMerge);
        verifyFilesMerged();
    });

    it('should log error file when folder does not exist', async function () {
        mockFileSystemForSplit();
        let logSpy = sandbox.spy(Log, 'error');
        let res = await new Davos.Core().merge(inputDirForMerge + 'test', outputDirMerge);
        expect(res).to.be.false;
        expect(logSpy.callCount).to.equal(1);
    });

    it('should create new folder with --force if it does not exists', async function () {
        mockFileSystemForSplit();
        const newDir = 'test';
        const params = { command: { in: inputDirForMerge + newDir, out: outputDir, force: true } };
        await new Davos.Core(params, false).merge();
        let files = fs.readdirSync(inputDirForMerge);
        expect(files.indexOf(newDir)).not.equal(-1);
    });

    it('should log erro if params in and out not provided', async function () {
        const params = { command: {} };

        let logSpy = sandbox.spy(Log, 'error');
        console.log(logSpy.callCount + " Spy count")
        let res = await new Davos.Core(params, false).merge();
        expect(res).to.be.false;
        expect(logSpy.callCount).to.equal(1);
    });
});

describe('Upload Meta', function () {

    afterEach(function () {
        mockfs.restore();
        sandbox.restore();
    });

    it('should upload metadata to server via CLI without config file', async function () {
        stubBMMethodsForUploadMeta()
        let params = { pattern: 'davos-meta-bundle.xml', hostname: "test.demandware.net", username: "user", password: "password", codeVersion: "v1" };
        mockFileSystemForUploadMetaWithoutConfigFile();
        await new Davos.Core(params).uploadMeta();
        sandbox.assert.calledOnce(BM.prototype.deleteMeta);
    });

    it('should upload metadata to server via CLI with config file', async function () {
        stubBMMethodsForUploadMeta()
        let params = { pattern: 'davos-meta-bundle.xml' };
        mockFileSystemForUploadMetaWithConfigFile();
        await new Davos.Core(params).uploadMeta();
        sandbox.assert.calledOnce(BM.prototype.deleteMeta);
    });

    it('should upload metadata to server via gulp without config file', async function () {
        stubBMMethodsForUploadMeta()
        mockFileSystemForUploadMetaWithoutConfigFile();
        await new Davos.Core().uploadMeta({ "pattern": "davos-meta-bundle.xml", "username": "user", "hostname": "test.demandware.net", "password": "pass", "codeVersion": "v1" });
        sandbox.assert.calledOnce(BM.prototype.deleteMeta);
    });

    it('should upload metadata to server via gulp with config file', async function () {
        stubBMMethodsForUploadMeta()
        mockFileSystemForUploadMetaWithConfigFile();
        await new Davos.Core().uploadMeta({ "pattern": "davos-meta-bundle.xml" });
        sandbox.assert.calledOnce(BM.prototype.deleteMeta);
    });

    it('should log error if configuration is not provided via CLI', async function () {
        let params = { pattern: 'davos-meta-bundle.xml' };
        let logSpy = sandbox.spy(Log, 'error');
        let res = await new Davos.Core(params).uploadMeta();
        expect(res).to.be.false;
        expect(logSpy.callCount).to.be.equal(5);
    });

    it('should log error if configuration is not provided via gulp', async function () {
        let logSpy = sandbox.spy(Log, 'error');
        let res = await new Davos.Core().uploadMeta({pattern: 'davos-meta-bundle.xml'});
        expect(res).to.be.false;
        expect(logSpy.callCount).to.be.equal(5);
    });

});

describe('Upload Sites', function () {

    afterEach(function () {
        mockfs.restore();
        sandbox.restore();
    });

    it('should upload site meta to server with config file', async function () {
        stubBMMethodsForUploadSites();
        mockFileSystemForUploadMetaWithConfigFile();
        const params = { meta: "sites/site_template/meta" }
        await new Davos.Core(params).uploadSitesMeta();
        sandbox.assert.calledOnce(BM.prototype.deleteSitesArchive);
    });

    it('should upload site meta to server without config file', async function () {
        stubBMMethodsForUploadSites();
        mockFileSystemForUploadMetaWithoutConfigFile();
        const params = { "meta": "sites/site_template/meta", "username": "user", "hostname": "test.demandware.net", "password": "pass", "codeVersion": "v1", "exclude": ["**/node_modules/**", "**/.git/**", "**/.svn/**", "**/.sass-cache/**"] }
        await new Davos.Core(params).uploadSitesMeta();
        //sandbox.assert.calledOnce(BM.prototype.deleteSitesArchive);
    });

});

describe('Upload Cartridges', function () {

    afterEach(function () {
        mockfs.restore();
        sandbox.restore();
    });

    it('should upload cartridges to server with config file via CLI', async function () {
        stubWebDavMethodsForUploadCartridges();
        mockFileSystemForUploadCartridgesWithConfigFile();
        let logSpy = sandbox.spy(Log, 'error');
        await new Davos.Core().uploadCartridges();
        sandbox.assert.calledOnce(WebDav.prototype.delete);
        expect(logSpy.callCount).to.be.equal(0);
    });

    it('should upload cartridges to server without config file via CLI', async function () {
        stubWebDavMethodsForUploadCartridges();
        mockFileSystemForUploadCartridgesWithOutConfigFile();
        let logSpy = sandbox.spy(Log, 'error');
        const params = { "username": "user", "hostname": "test.demandware.net", "password": "pass", "codeVersion": "v1", "exclude": ["**/node_modules/**", "**/.git/**", "**/.svn/**", "**/.sass-cache/**"],  "cartridge": ["app_storefront"] }
        await new Davos.Core(params).uploadCartridges();
        sandbox.assert.calledOnce(WebDav.prototype.delete);
        expect(logSpy.callCount).to.be.equal(0);
    });

    it('should log error when execute upload cartridges command without config details via CLI', async function () {
        stubWebDavMethodsForUploadCartridges();
        mockFileSystemForUploadCartridgesWithOutConfigFile();
        let logSpy = sandbox.spy(Log, 'error');
        const params = { "username": "user", "hostname": "test.demandware.net", "password": "pass", "codeVersion": "v1", "exclude": ["**/node_modules/**", "**/.git/**", "**/.svn/**", "**/.sass-cache/**"],  "cartridge": ["app_storefront"] }
        let res = await new Davos.Core().uploadCartridges();
        //expect(res).to.be.false;
        //expect(logSpy.callCount).to.be.equal(5);
    });

})

function mockFileSystemForSplit() {
    mockfs({
        'test/files': {
            'some-file.xml': fs.readFileSync('test/files/test123.xml', 'UTF-8').toString()
        },
        [outputDir]: {/** another empty directory */ },
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
        [outputDir]: {/** another empty directory */ },
        'resources': {
            'library.template': fs.readFileSync('resources/library.template', 'UTF-8').toString()
        }
    });
}

function mockFileSystemForUploadMetaWithoutConfigFile() {
    mockfs({
        'tmp': {},
        [outputDir]: {/** another empty directory */ },
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
        [outputDir]: {/** another empty directory */ },
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
        [outputDir]: {/** another empty directory */ },
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
        'tmp': {},
        [outputDir]: {/** another empty directory */ },
        'resources': {
            'library.template': fs.readFileSync('resources/library.template', 'UTF-8').toString()
        },
        'sites/site_template/meta': {
            'davos-meta-bundle.xml': fs.readFileSync('test/files/test123.xml', 'UTF-8').toString()
        },
        'app_storefront': {}
    });
}

function verifyFileSplitted() {
    let files = fs.readdirSync(outputDir);

    expect(files.length).to.equal(5);
    const expectedIds = [
        '047-banners-hero-v1',
        '047-banners-hero-v2',
        '047-banners-hero-v4',
        '047-banners-hero-v5',
        'banners-hero-twoimages'
    ];
    expectedIds.forEach(id => {
        let content = fs.readFileSync(path.resolve(outputDir, `library.${id}.xml`), 'UTF-8');
        expect(content).to.contain(id);
    });
}

function verifyFilesMerged() {
    const files = fs.readdirSync(outputDir);
    expect(files.length).to.equal(1);
    let content = fs.readFileSync(path.resolve(outputDir, 'myTest.xml'), 'UTF-8');
    const expectedIds = [
        '047-banners-hero-v1',
        '047-banners-hero-v2'
    ];
    expectedIds.forEach(id => {
        expect(content).to.contain(id);
    });
}

function stubBMMethodsForUploadMeta() {
    sandbox.stub(BM.prototype, 'uploadMeta').resolves(true);
    sandbox.stub(BM.prototype, 'login').resolves(true);
    sandbox.stub(BM.prototype, 'validateMetaImport').resolves(true);
    sandbox.stub(BM.prototype, 'checkImportProgress').resolves(true);
    sandbox.stub(BM.prototype, 'importMeta').resolves(true);
    sandbox.stub(BM.prototype, 'deleteMeta').resolves(true);
}

function stubBMMethodsForUploadSites() {
    sandbox.stub(BM.prototype, 'uploadSitesArchive').resolves(true);
    sandbox.stub(BM.prototype, 'login').resolves(true);
    sandbox.stub(BM.prototype, 'ensureNoImport').resolves(true);
    sandbox.stub(BM.prototype, 'importSites').resolves(true);
    sandbox.stub(BM.prototype, 'checkImportProgress').resolves(true);
    sandbox.stub(BM.prototype, 'deleteSitesArchive').resolves(true);
}

function stubBMMethodsForUploadSites() {
    sandbox.stub(BM.prototype, 'uploadSitesArchive').resolves(true);
    sandbox.stub(BM.prototype, 'login').resolves(true);
    sandbox.stub(BM.prototype, 'ensureNoImport').resolves(true);
    sandbox.stub(BM.prototype, 'importSites').resolves(true);
    sandbox.stub(BM.prototype, 'checkImportProgress').resolves(true);
    sandbox.stub(BM.prototype, 'deleteSitesArchive').resolves(true);
}

function stubWebDavMethodsForUploadCartridges() {
    sandbox.stub(WebDav.prototype, 'put').resolves(true);
    sandbox.stub(WebDav.prototype, 'unzip').resolves(true);
    sandbox.stub(WebDav.prototype, 'delete').resolves(true);
}
