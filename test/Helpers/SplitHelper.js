'use strict';

const fs = require('fs');
const {expect} = require('chai');
const path = require('path');
const { Paths: { OutputDir } } = require('../Constants');

function verifyFileSplitted() {
    const files = fs.readdirSync(OutputDir);

    expect(files.length).to.equal(5);
    const expectedIds = [
        '047-banners-hero-v1',
        '047-banners-hero-v2',
        '047-banners-hero-v4',
        '047-banners-hero-v5',
        'banners-hero-twoimages'
    ];
    expectedIds.forEach(id => {
        const content = fs.readFileSync(path.resolve(OutputDir, `library.${id}.xml`), 'UTF-8');
        expect(content).to.contain(id);
    });
}

module.exports = {
    verifyFileSplitted,
};
