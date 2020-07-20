
function stubPrompForCreateConfig(configManager) {
    const sinon = require('sinon');
    const prompt = require('prompt');

    sinon.stub(prompt, 'get').callsFake(() => {
        configManager.saveConfiguration([
            {
                active: true,
                profile: 'test',
                config: {
                    hostname: 'test',
                    username: 'test',
                    password: 'test',
                    codeVersion: 'test',
                    cartridge: ['test'],
                    indentSize: '2',
                    exclude: 'test',
                    templateReplace: {
                        files: ['test'],
                        pattern: {
                            buildVersion: '@DEPLOYMENT_VERSION@'
                        }
                    }
                }
            }
        ]);
    });
}

module.exports = {
    stubPrompForCreateConfig,
};
