const sandbox = require('sinon').createSandbox();
const BM = require('../../src/bm');
const WebDav = require('../../src/webdav');

function stubSandbox() {
    sandbox.stub(BM.prototype, 'uploadMeta').resolves(true);
    sandbox.stub(BM.prototype, 'login').resolves(true);
    sandbox.stub(BM.prototype, 'validateMetaImport').resolves(true);
    sandbox.stub(BM.prototype, 'checkImportProgress').resolves(true);
    sandbox.stub(BM.prototype, 'importMeta').resolves(true);
    sandbox.stub(BM.prototype, 'deleteMeta').resolves(true);

    sandbox.stub(BM.prototype, 'uploadSitesArchive').resolves(true);
    sandbox.stub(BM.prototype, 'ensureNoImport').resolves(true);
    sandbox.stub(BM.prototype, 'importSites').resolves(true);
    sandbox.stub(BM.prototype, 'deleteSitesArchive').resolves(true);

    sandbox.stub(WebDav.prototype, 'put').resolves(true);
    sandbox.stub(WebDav.prototype, 'unzip').resolves(true);
    sandbox.stub(WebDav.prototype, 'delete').resolves(true);

    return sandbox;
}

module.exports = stubSandbox();
