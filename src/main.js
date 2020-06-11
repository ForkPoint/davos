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
const ActivateCodeVer = require('./tasks/code.activate');
const DeployCodeVersion = require('./tasks/code.deploy');
const CodeList = require('./tasks/code.list');
const CodeShift = require('./tasks/code.shift');
const Watcher = require('./tasks/watch');
const ReplaceRevisionNumber = require('./tasks/replace.revisionNumber');
const SplitMeta = require('./tasks/meta.split');
const MergeMeta = require('./tasks/meta.merge');

class Davos {
  constructor(config) {
    this.ConfigManager = new ConfigManager(config || {});
    this.SFCCManager = new SFCCManager(this.ConfigManager.getActiveConfig());
  }

  /** List code versions */
  listCode(token) {
    const config = this.ConfigManager.getActiveConfig();
    CodeList(config.hostname, token);
  }

  /**
   * Upload cartridges
   */
  uploadCartridges() {
    UploadCartridges(this.ConfigManager.getActiveConfig());
  }

  /**
   * Upload sites metadata
   * @param {array} arrayWithGlob
   */
  uploadSitesMeta(arrayWithGlob) {
    UploadSitesMeta(arrayWithGlob, this.ConfigManager.getActiveConfig(), this.SFCCManager);
  }

  /**
   * Activate code version
   */
  activateCodeVersion(token, codeVers) {
    ActivateCodeVer(this.ConfigManager.getActiveConfig().hostname, token, codeVers);
  }

  /**
   * Shifts the code versions back and forth
   */
  shiftCodeVers(token) {
    CodeShift(this.ConfigManager.getActiveConfig(), token);
  }

  /**
   * Deploys a code version to the active config instance
   */
  deployCodeVer(token) {
    DeployCodeVersion(this.ConfigManager.getActiveConfig(), token);
  }

  /**
   * Watch files for changes
   */
  watch() {
    Watcher(this.ConfigManager.getActiveConfig());
  }

  /**
   * Replace a placeholder in all files matching pattern with the current code version defined in davos.json.
   *
   * @param {string} pattern Starts from project root or cwd
   * @param {string} placeholder A string to look for
   */
  replaceRevisionNumber(pattern, placeholder = "@BUILD_NUMBER@") {
    const config = this.ConfigManager.getActiveConfig();
    ReplaceRevisionNumber(pattern, placeholder = "@BUILD_NUMBER@", config);
  }

  /**
   * Metadata Split
   * 
   * Split a big Metadata xml file into smaller chunks, separated by object type definition
   */
  async split(paramIn = null, paramOut = null, force = null) {
    await SplitMeta(paramIn, paramOut, force, this.ConfigManager.getActiveConfig());
  }

  /**
   * Metadata Merge
   * 
   * Merge a bunch of xml files with the same root element into a bundle.
   */
  async merge(paramIn = null, paramOut = null, force = null) {
    await MergeMeta(paramIn, paramOut, force, this.ConfigManager.getActiveConfig());
  }
}

module.exports = Davos;
