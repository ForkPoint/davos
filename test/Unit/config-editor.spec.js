'use strict';

const {expect} = require('chai');
const mockfs = require('mock-fs');
const sinon = require('sinon');
const path = require('path');
const ConfigEditor = require('../../src/config-editor');
const mockHelper = require('../Helpers/MockHelper');
const fs = require('fs');
const stubHelper = require('../Helpers/StubHelper');
const Log = require('../../src/logger');
const sandbox = require('../Stubs/SandboxStub');

let logSpy;

describe.only('Unit: Config-Editor', () => {
    afterEach(() => {
        mockfs.restore();
        sandbox.resetHistory();
        sinon.restore();
    });

    /** Config Editor Initialization */
    it('should create an ConfigEditor instance', () => {
        const configEditor = new ConfigEditor({});

        expect(configEditor).to.not.be.null;
        expect(configEditor).to.have.property('config');
        expect(configEditor).to.have.property('ConfigManager');
        expect(configEditor).to.have.property('workingDir');
    });

    /** Create configuration file profile */
    it('should create an configuration file from input', () => {
        const configEditor = new ConfigEditor({});
        let jsonExists = false;
        let davosJson = '';
        let davosObj = [];
        let profile = {};
        const davosConfig = path.join(process.cwd(), 'davos.json');

        mockHelper.mockDavosJson();
        stubHelper.stubPrompForCreateConfig(configEditor.ConfigManager);
        configEditor.createConfig();

        jsonExists = fs.existsSync(davosConfig);

        try {
            davosJson = fs.readFileSync(davosConfig).toString();
            davosObj = JSON.parse(davosJson);
            profile = davosObj[0];
        } catch(err) {
            console.log(err);
            return;
        }

        expect(jsonExists).to.be.true;
        expect(davosJson).to.have.length.above(0);
        expect(davosObj).to.be.an('array');
        expect(profile).to.have.property('profile');
        expect(profile).to.have.property('config');
        expect(profile).to.have.property('active');
    });

    /** List profiles in configuration file */
    it('should list the current profiles in the configuration file', () => {
        let configEditor = {};
        let davosJson = [];

        logSpy = sandbox.spy(Log, 'info');
        mockHelper.mockDavosJsonWithProfiles();
        configEditor = new ConfigEditor({});
        configEditor.listProfiles();

        try {
            davosJson = JSON.parse(fs.readFileSync(`${process.cwd()  }/davos.json`));
        } catch(err) {
            console.log(err);
            return;
        }

        expect(logSpy.callCount).to.equal(davosJson.length);
        logSpy.restore();
    });

    /** Switch functionality should be reworked first! */
    // it('should switch active profile with another one', function() {
    //     let configEditor = {};
    //     let davosJson = [];
    //     let currentActiveProfile;
    //     let previosActiveProfile;

    //     logSpy = sandbox.spy(Log, 'info');
    //     mockHelper.mockDavosJsonWithProfiles();

    //     try {
    //         davosJson = JSON.parse(fs.readFileSync(process.cwd() + '/davos.json'));
    //     } catch(err) {
    //         console.log(err);
    //         return;
    //     }

    //     previosActiveProfile = davosJson.find(function(profile) {
    //         return profile.active;
    //     });

    //     configEditor = new ConfigEditor({});
    //     configEditor.switchProfile();

    //     currentActiveProfile = davosJson.find(function (profile) {
    //         return profile.active;
    //     });

    //     expect(logSpy.callCount).to.equal(1);
    //     expect(currentActiveProfile).not.to.be.equal(previosActiveProfile);
    //     logSpy.restore();
    // });

    it('should edit an existing configuration and save it in the configuration json', () => {
        let configEditor = {};
        let jsonExists = false;
        let davosJson = '';
        let davosObj = [];
        let activeProfile = {};

        mockHelper.mockDavosJsonWithProfiles();
        configEditor = new ConfigEditor({});
        configEditor.createConfig();
        stubHelper.stubPrompForCreateConfig(configEditor.ConfigManager);

        configEditor.editProfile();

        jsonExists = fs.existsSync(`${process.cwd()  }/davos.json`);
        try {
            davosJson = fs.readFileSync(`${process.cwd()  }/davos.json`);
            davosObj = JSON.parse(davosJson);
            activeProfile = davosObj.find(profile => profile.active);
        } catch(err) {
            console.log(err);
            return;
        }

        expect(jsonExists).to.be.true;
        expect(davosJson).to.have.length.above(0);
        expect(davosObj).to.be.an('array');
        expect(activeProfile).to.have.property('profile');
        expect(activeProfile).to.have.property('config');
        expect(activeProfile).to.have.property('active');
        // equal part must be the same as the active profile in the mock davos json
        expect(activeProfile).property('profile').to.be.equal('test');
    });
});
