const sandbox = require('../../Stubs/SandboxStub');
const expect = require('chai').expect;
const mockfs = require('mock-fs');
const Davos = require('../../../index');
const Log = require('../../../src/logger');
const fs = require('fs');
const { verifyFileSplitted } = require('../../Helpers/SplitHelper');
const { mockFileSystemForSplit } = require('../../Helpers/MockHelper');
const { Paths: { OutputDir, InputFile } } = require('../../Constants');

let logSpy = null;

describe('INTEGRATION: Meta Split', function () {
    afterEach(function () {
        mockfs.restore();
        sandbox.resetHistory();
    });

    it('should split meta file on CLI', async function () {
        mockFileSystemForSplit();
        const params = { command: { in: InputFile, out: OutputDir } };
        const davos = new Davos(params);
        await davos.split();
        verifyFileSplitted();
    });

    it('should split meta file with gulp', async function () {
        mockFileSystemForSplit();
        const davos = new Davos();
        await davos.split(InputFile, OutputDir);
        verifyFileSplitted();
    });

    it('should log error file when folder does not exist', async function () {
        mockFileSystemForSplit();
        logSpy = sandbox.spy(Log, 'error');
        const davos = new Davos();
        let res = davos.split(InputFile, OutputDir + 'test');
        expect(res).to.be.false;
        expect(logSpy.callCount).to.equal(1);
        logSpy.restore();
    });

    it('should create new folder with --force if it does not exists', async function () {
        mockFileSystemForSplit();
        const newDir = 'test';
        const params = { command: { in: InputFile, out: OutputDir + newDir, force: true } };
        const davos = new Davos(params);
        await davos.split();
        let files = fs.readdirSync(OutputDir);
        expect(files.indexOf(newDir)).not.equal(-1);
    });

    it('should log erro if params in and out not provided', async function () {
        const params = { command: {} };
        logSpy = sandbox.spy(Log, 'error');
        const davos = new Davos(params);
        let res = davos.split();
        expect(res).to.be.false;
        expect(logSpy.callCount).to.equal(1);
        logSpy.restore();
    });

});
