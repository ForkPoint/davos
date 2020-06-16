/**
 * Class Configuration
 * Represents a single configuration, attached to a certain Profile
 * 
 * @param {object} config 
 */
class Configuration {
    constructor(config) {
        this.hostname = config.hostname || '';
        this.username = config.username || '';
        this.password = config.password || '';
        this.codeVersion = config.codeVersion || '';
        this.cartridge = config.cartridge || [];
        this.exclude = config.exclude || [];
        this.indentSize = config.indentSize || 2;
    }

    SetProperty(name, value) {
        this[name] = value;
    }

    Has(propertyName) {
        return Object.prototype.hasOwnProperty.call(this, propertyName);
    }
}

module.exports = Configuration;
