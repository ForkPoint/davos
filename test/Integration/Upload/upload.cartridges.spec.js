const Davos = require('../../../index');
const Log = require('../../../src/logger');
const expect = require('chai').expect;
const WebDav = require('../../../src/webdav');
const mockfs = require('mock-fs');
const sandbox = require('../../Stubs/SandboxStub');
const {
    mockFileSystemForUploadCartridgesWithConfigFile,
    mockFileSystemForUploadCartridgesWithOutConfigFile,
} = require('../../Helpers/MockHelper');

let LogSpy;

describe('INTEGRATION: Upload Cartridges', function () {
    afterEach(function () {
        mockfs.restore();
        LogSpy.restore();
        sandbox.resetHistory();
    });

    it('should upload cartridges to server with config file via CLI', async function () {
        this.enableTimeouts(false);
        mockFileSystemForUploadCartridgesWithConfigFile();
        LogSpy = sandbox.spy(Log, 'error');
        const davos = new Davos();
        await davos.uploadCartridges();
        sandbox.assert.calledOnce(WebDav.prototype.delete);
        expect(LogSpy.callCount).to.be.equal(0);
    });

    it('should upload cartridges to server without config file via CLI', async function () {
        this.enableTimeouts(false);
        mockFileSystemForUploadCartridgesWithOutConfigFile();
        LogSpy = sandbox.spy(Log, 'error');
        const params = { "username": "user", "hostname": "test.demandware.net", "password": "pass", "codeVersion": "v1", "exclude": ["**/node_modules/**", "**/.git/**", "**/.svn/**", "**/.sass-cache/**"], "cartridge": ["app_storefront"] }
        const davos = new Davos(params);
        await davos.uploadCartridges();
        sandbox.assert.calledOnce(WebDav.prototype.delete);
        expect(LogSpy.callCount).to.be.equal(0);
    });

    // it('should log error when execute upload cartridges command without config details via CLI', async function () {
    //     mockFileSystemForUploadCartridgesWithOutConfigFile();
    //     LogSpy = sandbox.spy(Log, 'error');
    //     const params = { "username": "user", "hostname": "test.demandware.net", "password": "pass", "codeVersion": "v1", "exclude": ["**/node_modules/**", "**/.git/**", "**/.svn/**", "**/.sass-cache/**"], "cartridge": ["app_storefront"] }
    //     let res = await new Davos.Core().uploadCartridges();
    //     //expect(res).to.be.false;
    //     //expect(logSpy.callCount).to.be.equal(5);
    // });
})