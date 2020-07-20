const {expect} = require('chai');
const mockfs = require('mock-fs');
// const sandbox = require('../Stubs/SandboxStub');
const cartridgeHelper = require('../../src/cartridge-helper');
const sinon = require('sinon');
// const Constants = require('../../src/constants');
// const utils = require('../../src/util');
const Configuration = require('../Mock/Configuration');
const mockHelper = require('../Helpers/MockHelper');
const globby = require('globby');

describe('Unit: Cartridge Helper', () => {
    afterEach(() => {
        mockfs.restore();
    });

    /** Get Cartridge Path */
    it('should return cartridge path, based on the current root', () => {
        const path = cartridgeHelper.getCartridgesPath();

        expect(path).to.be.string;
        expect(path).length.to.be.greaterThan(0);
    });

    /** Get Cartridges */
    it('should return an array containing cartridges paths from the configuration', () => {
        const config = new Configuration({ cartridge: ['app_test/cartridge'] });
        const cartridges = cartridgeHelper.getCartridges(null, config);

        expect(cartridges).to.be.an('array');
        expect(cartridges).to.have.lengthOf(1);
    });

    it('should return an array containing cartridges paths from the system, with configuration passed', () => {
        const config = new Configuration({ cartridge: ['app_test/cartridge'] });
        let cartridges = [];

        mockHelper.mockGetCartridges();
        cartridges = cartridgeHelper.getCartridges(true, config);

        expect(cartridges).to.be.an('array');
        expect(cartridges).to.have.lengthOf(2);
    });

    /** Get Cartridges From Dir */
    /**
     * TODO: cartridgeHelper.getCartridgesFromDir doesn't return an array of cartridge paths
     * It's not working in the config-editor either... FIX
     */
    // it('should return an array containing cartridges paths, from a specified dir', function() {
    //     const dir = process.cwd();
    //     let cartridges = [];

    //     mockHelper.mockGetCartridges();

    //     sinon.stub(globby, 'sync').callsFake(function () {
    //         return ['1', '2'];
    //     });
    //     cartridges = cartridgeHelper.getCartridgesFromDir(dir);

    //     expect(cartridges).to.be.an('array');
    //     expect(cartridges).to.have.lengthOf(2);
    // });
});