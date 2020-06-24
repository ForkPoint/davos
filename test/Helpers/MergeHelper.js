const fs = require('fs');
const expect = require('chai').expect;
const path = require('path');
const { Paths: { OutputDir } } = require('../Constants');

function verifyFilesMerged() {
    const files = fs.readdirSync(OutputDir);
    expect(files.length).to.equal(1);
    let content = fs.readFileSync(path.resolve(OutputDir, 'myTest.xml'), 'UTF-8');
    const expectedIds = [
        '047-banners-hero-v1',
        '047-banners-hero-v2'
    ];
    expectedIds.forEach(id => {
        expect(content).to.contain(id);
    });
}

module.exports = {
    verifyFilesMerged: verifyFilesMerged
};
