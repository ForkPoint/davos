const expect = require('chai').expect;
const mockfs = require('mock-fs');
const sinon = require('sinon');
const Davos = require('../../src/main');
const mockHelper = require('../Helpers/MockHelper');
const fs = require('fs');
const stubHelper = require('../Helpers/StubHelper');
const Log = require('../../src/logger');
const sandbox = require('../Stubs/SandboxStub');

let logSpy;

describe.only('Integration: Config-Manager', function () {
    afterEach(function () {
        mockfs.restore();
        sandbox.resetHistory();
        sinon.restore();
    });

    /** Config Editor Initialization */
    it('should initialize ConfigManager and create profiles, based on the configuration file', function () {
        let davos = {};
        let davosJson = '';
        let davosObj = [];

        mockHelper.mockDavosJsonWithProfiles();

        davos = new Davos();

        try {
            davosJson = fs.readFileSync(process.cwd() + '/davos.json');
            davosObj = JSON.parse(davosJson);
        } catch (err) {
            console.log(err);
            return;
        }

        expect(davos.ConfigManager.profiles).to.be.an('array');
        expect(davos.ConfigManager.profiles).to.have.length(davosObj.length);
    });
});