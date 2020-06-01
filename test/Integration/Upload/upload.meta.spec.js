const Davos = require('../../../index');
const BM = require('../../../src/bm');
const expect = require('chai').expect;
const Log = require('../../../src/logger');
const mockfs = require('mock-fs');
const sandbox = require('../../Helpers/SandboxStub');
const { stubBMMethodsForUploadMeta } = require('../../Helpers/SandboxStub');
const { mockFileSystemForUploadMetaWithoutConfigFile, mockFileSystemForUploadMetaWithConfigFile } = require('../../Helpers/MockHelper');

let LogSpy = null;

describe('INTEGRATION: Upload Meta', function () {
    afterEach(function () {
        mockfs.restore();
        sandbox.resetHistory();
    });

    it('should upload metadata to server via CLI without config file', async function () {
        let params = { pattern: 'davos-meta-bundle.xml', hostname: "test.demandware.net", username: "user", password: "password", codeVersion: "v1" };
        mockFileSystemForUploadMetaWithoutConfigFile();
        const davos = new Davos(params);
        await davos.uploadMeta();
        sandbox.assert.calledOnce(BM.prototype.deleteMeta);
    });
    
    it('should upload metadata to server via CLI with config file', async function () {
        let params = { pattern: 'davos-meta-bundle.xml' };
        mockFileSystemForUploadMetaWithConfigFile();
        const davos = new Davos(params);
        await davos.uploadMeta();
        sandbox.assert.calledOnce(BM.prototype.deleteMeta);
    });

    it('should upload metadata to server via gulp without config file', async function () {
        mockFileSystemForUploadMetaWithoutConfigFile();
        const davos = new Davos();
        await davos.uploadMeta({ "pattern": "davos-meta-bundle.xml", "username": "user", "hostname": "test.demandware.net", "password": "pass", "codeVersion": "v1" });
        sandbox.assert.calledOnce(BM.prototype.deleteMeta);
    });

    it('should upload metadata to server via gulp with config file', async function () {
        mockFileSystemForUploadMetaWithConfigFile();
        const davos = new Davos();
        await davos.uploadMeta({ "pattern": "davos-meta-bundle.xml" });
        sandbox.assert.calledOnce(BM.prototype.deleteMeta);
    });

    it('should log error if configuration is not provided via CLI', async function () {
        this.enableTimeouts(false);
        let params = { pattern: 'davos-meta-bundle.xml' };
        LogSpy = sandbox.spy(Log, 'error');
        const davos = new Davos(params);
        let res = await davos.uploadMeta();
        expect(res).to.be.undefined;
        /**
         * 5 errors:
         * 1: no file has been found, no configuration
         * 2-5: the required parameters were not passed
         */
        expect(LogSpy.callCount).to.be.equal(5);
        LogSpy.restore();
    });

    it('should log error if configuration is not provided via gulp', async function () {
        this.enableTimeouts(false);
        LogSpy = sandbox.spy(Log, 'error');
        const davos = new Davos();
        let res = await davos.uploadMeta({ pattern: 'davos-meta-bundle.xml' });
        expect(res).to.be.undefined;
        expect(LogSpy.callCount).to.be.equal(1);
        LogSpy.restore();
    });

});
