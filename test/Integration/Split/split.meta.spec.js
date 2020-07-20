const sandbox = require('../../Stubs/SandboxStub');
const {expect} = require('chai');
const mockfs = require('mock-fs');
const Davos = require('../../../index');
const Log = require('../../../src/logger');
const fs = require('fs');
const { verifyFileSplitted } = require('../../Helpers/SplitHelper');
const { mockFileSystemForSplit } = require('../../Helpers/MockHelper');
const { Paths: { OutputDir, InputFile } } = require('../../Constants');

let logSpy = null;

describe('INTEGRATION: Meta Split', () => {
    afterEach(() => {
        mockfs.restore();
        sandbox.resetHistory();
    });

    it('should split meta file on CLI', async () => {
        mockFileSystemForSplit();
        const params = { command: { in: InputFile, out: OutputDir } };
        const davos = new Davos(params);
        await davos.split();
        verifyFileSplitted();
    });

    it('should split meta file with gulp', async () => {
        mockFileSystemForSplit();
        const davos = new Davos();
        await davos.split(InputFile, OutputDir);
        verifyFileSplitted();
    });

    it('should log error file when folder does not exist', async () => {
        mockFileSystemForSplit();
        logSpy = sandbox.spy(Log, 'error');
        const davos = new Davos();
        const res = davos.split(InputFile, `${OutputDir  }test`);
        expect(res).to.be.false;
        expect(logSpy.callCount).to.equal(1);
        logSpy.restore();
    });

    it('should create new folder with --force if it does not exists', async () => {
        mockFileSystemForSplit();
        const newDir = 'test';
        const params = { command: { in: InputFile, out: OutputDir + newDir, force: true } };
        const davos = new Davos(params);
        await davos.split();
        const files = fs.readdirSync(OutputDir);
        expect(files.indexOf(newDir)).not.equal(-1);
    });

    it('should log erro if params in and out not provided', async () => {
        const params = { command: {} };
        logSpy = sandbox.spy(Log, 'error');
        const davos = new Davos(params);
        const res = davos.split();
        expect(res).to.be.false;
        expect(logSpy.callCount).to.equal(1);
        logSpy.restore();
    });

});
