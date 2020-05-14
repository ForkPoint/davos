// // const sandbox = require('sinon').createSandbox();
// const sandbox = require('../../Helpers/StubHelper');
// const Davos = require('../../../index');
// const BM = require('../../../src/bm');
// const mockfs = require('mock-fs');
// const {
//     mockFileSystemForUploadMetaWithConfigFile,
//     mockFileSystemForUploadMetaWithoutConfigFile
// } = require('../../Helpers/MockHelper');

/**
 * Implement tests when the new upload/merge logic is in place
 */


// describe.only('Upload Sites', function () {
//     afterEach(function () {
//         mockfs.restore();
//         sandbox.resetHistory();
//     });

//     it('should upload site meta to server WITH config file', async function () {
//         // stubBMMethodsForUploadSites();
//         this.enableTimeouts(false);
//         mockFileSystemForUploadMetaWithConfigFile();
//         const params = { meta: "sites/site_template/meta" };
//         const davos = new Davos(params);
//         await davos.uploadSitesMeta();
//         sandbox.assert.calledOnce(BM.prototype.deleteSitesArchive);
//     });

//     it.only('should upload site meta to server WITHOUT config file', async function () {
//         // stubBMMethodsForUploadSites();
//         this.enableTimeouts(false);
//         mockFileSystemForUploadMetaWithoutConfigFile();
//         const params = { "meta": "sites/site_template/meta", "username": "user", "hostname": "test.demandware.net", "password": "pass", "codeVersion": "v1", "exclude": ["**/node_modules/**", "**/.git/**", "**/.svn/**", "**/.sass-cache/**"] }
//         const davos = new Davos(params);
//         await davos.uploadSitesMeta();
//         sandbox.assert.calledOnce(BM.prototype.deleteSitesArchive);
//     });
// });

