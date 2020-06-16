const sandbox = require('../../Stubs/SandboxStub');
const expect = require('chai').expect;
const Davos = require('../../../index');
const Log = require('../../../src/logger');
const mockfs = require('mock-fs');
const fs = require('fs');
const { verifyFilesMerged } = require('../../Helpers/MergeHelper');
const { mockFileSystemForMerge, mockFileSystemForSplit } = require('../../Helpers/MockHelper');
const { Paths: { OutputDir, InputMergeDir, OutputMergeFile } } = require('../../Constants');

let logSpy = null;

describe('INTEGRATION: Meta Merge', function () {
    afterEach(function () {
        mockfs.restore();
        sandbox.resetHistory();
    });

    it('should merge meta file on CLI', async function () {
        this.enableTimeouts(false);
        mockFileSystemForMerge();
        const params = { command: { in: InputMergeDir, out: OutputMergeFile } };
        const davos = new Davos(params);
        
        await davos.merge();
        verifyFilesMerged();
    });
    
    it('should merge meta file on gulp', async function () {
        this.enableTimeouts(false);
        mockFileSystemForMerge();
        const davos = new Davos();

        await davos.merge(InputMergeDir, OutputMergeFile);
        verifyFilesMerged();
    });

    it('should log error file when folder does not exist', async function () {
        mockFileSystemForMerge();
        const davos = new Davos();
        logSpy = sandbox.spy(Log, 'error');
        const newDir = InputMergeDir + 'test';
        let res = await davos.merge(newDir, OutputMergeFile);

        expect(res).to.be.false;
        expect(logSpy.callCount).to.equal(1);
        logSpy.restore();
    });

    it('should create new folder with --force if it does not exists', async function () {
        mockFileSystemForSplit();
        const newDir = 'test';
        const params = { command: { in: InputMergeDir + newDir, out: OutputDir, force: true } };
        const davos = new Davos(params);

        await davos.merge();

        let files = fs.readdirSync(InputMergeDir);
        expect(files.indexOf(newDir)).not.equal(-1);
    });

    it('should log error if params in and out not provided', async function () {
        const params = { command: {} };
        const davos = new Davos(params);
        logSpy = sandbox.spy(Log, 'error');

        let res = await davos.merge();

        expect(res).to.be.false;
        expect(logSpy.callCount).to.equal(1);
        logSpy.restore();
    });
});
