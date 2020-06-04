'use strict';

/**
 * Internal modules
 */
const ConfigManager = require('./config-manager');
const SFCCManager = require('./sfcc-manager');

/**
 * Tasks
 */
const UploadCartridges = require('./tasks/upload.cartridges');
const UploadSitesMeta = require('./tasks/upload.sites.meta');
const UploadMeta = require('./tasks/upload.meta');
const ActivateCodeVer = require('./tasks/code.activate');
const Watcher = require('./tasks/watch');
const Sync = require('./tasks/sync');
const ReplaceRevisionNumber = require('./tasks/replace.revisionNumber');
const SplitMeta = require('./tasks/meta.split');
const MergeMeta = require('./tasks/meta.merge');
const codeList = require('./tasks/list.code');

class Davos {
  constructor(config) {
    this.ConfigManager = new ConfigManager(config || {});
    this.SFCCManager = new SFCCManager(this.ConfigManager.getActiveConfig());
  }

  /** NEW/REWORKED DAVOS FUNCTIONALITIES [ WIP ]!!!*/
  listCode(token) {
    const config = this.ConfigManager.getActiveConfig();
    codeList(config.hostname, token);
  }
  /** END */

  /**
   * Upload cartridges
   */
  uploadCartridges() {
    UploadCartridges(this.ConfigManager.getActiveConfig()); // TODO: Adjust the passed config
  }

  /**
   * Upload sites metadata
   * @param {array} arrayWithGlob
   */
  uploadSitesMeta(arrayWithGlob) {
    UploadSitesMeta(arrayWithGlob, this.ConfigManager.getActiveConfig());
  }

  /**
   * Activate code version
   */
  activateCodeVersion() {
    ActivateCodeVer(this.ConfigManager.getActiveConfig()); // TODO: Adjust the passed config
  }

  /**
   * Watch files for changes
   */
  watch() {
    Watcher(this.ConfigManager.getActiveConfig()); // TODO: Adjust the passed config
  }

  /**
   * Sinchronice server site files with local version
   */
  sync() {
    Sync(this.ConfigManager.getActiveConfig()); // TODO: Adjust the passed config
  }

  /**
   * Replace a placeholder in all files matching pattern with the current code version defined in davos.json.
   *
   * @param {string} pattern Starts from project root or cwd
   * @param {string} placeholder A string to look for
   */
  replaceRevisionNumber(pattern, placeholder = "@BUILD_NUMBER@") {
    const config = this.ConfigManager.getActiveConfig();
    ReplaceRevisionNumber(pattern, placeholder = "@BUILD_NUMBER@", config); // TODO: Adjust the passed config
  }

  /**
   * Upload metadata for site
   * @params {object} object with params from gulp task
   */
  uploadMeta() {
    UploadMeta(this.ConfigManager.getActiveConfig()); // TODO: Adjust the passed config
  }

  /**
   * Metadata Split
   * 
   * Split a big Metadata xml file into smaller chunks, separated by object type definition
   */
  split(paramIn = null, paramOut = null, force = null) {
    SplitMeta(paramIn, paramOut, force, this.ConfigManager.getActiveConfig()); // TODO: Adjust the passed config
  }

  /**
   * Metadata Merge
   * 
   * Merge a bunch of xml files with the same root element into a bundle.
   */
  async merge(paramIn = null, paramOut = null, force = null) {
    MergeMeta(paramIn, paramOut, force, this.ConfigManager.getActiveConfig()); // TODO: Adjust the passed config
  }
}

module.exports = Davos;
