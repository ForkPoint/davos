'use strict';

/**
 * Internal modules
 */
const Configuration = require('./configuration');

/**
 * Class Profile
 * Represents a single profile with a given configuration
 *
 * @param {object} Profile Configuration
 * @param {bool} Active Profile
 * @param {string} Profile Name
 */
class Profile {
    constructor(config, active, name) {
        this.config = new Configuration(config);
        this.active = active;
        this.profile = name;
    }

    SetActive(status) {
        this.active = status;
    }
}

module.exports = Profile;
