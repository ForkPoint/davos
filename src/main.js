'use strict';

/**
 * Internal modules
 */
const ConfigManager = require('./config-manager');
const SFCCManager = require('./sfcc-manager');
const Log = require('./logger');

/**
 * Tasks
 */
const UploadCartridges = require('./tasks/upload.cartridges');
const UploadSitesMeta = require('./tasks/upload.sites.meta');
const ActivateCodeVer = require('./tasks/code.activate');
const DeployCodeVersion = require('./tasks/code.deploy');
const ListDeployCartridges = require('./tasks/code.listdeploy');
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
  async listCode() {
    const config = this.ConfigManager.getActiveConfig();
    await this.SFCCManager.Authenticate();
    await CodeList(config.hostname, this.SFCCManager.token);
  }

  /**
   * Upload cartridges
   */
  async uploadCartridges() {
    await UploadCartridges(this.ConfigManager.getActiveConfig());
  }

  /**
   * Upload sites metadata
   * @param {array} arrayWithGlob
   */
  async uploadSitesMeta(arrayWithGlob) {
    await this.SFCCManager.Authenticate();
    await UploadSitesMeta(arrayWithGlob, this.ConfigManager.getActiveConfig(), this.SFCCManager);
  }

  /**
   * Activate code version
   */
  async activateCodeVersion(codeVers) {
    await this.SFCCManager.Authenticate();
    await ActivateCodeVer(this.ConfigManager.getActiveConfig().hostname, this.SFCCManager.token, codeVers);
  }

  /**
   * Shifts the code versions back and forth
   */
  async shiftCodeVers() {
    await this.SFCCManager.Authenticate();
    await CodeShift(this.ConfigManager.getActiveConfig(), this.SFCCManager.token);
  }

  /**
   * Deploys a code version to the active config instance
   */
  async deployCodeVer() {
    await this.SFCCManager.Authenticate();
    await DeployCodeVersion(this.ConfigManager.getActiveConfig(), this.SFCCManager.token);
  }

  /**
   * Lists the deploy cartridges
   */
  listDeploy() {
    ListDeployCartridges(this.ConfigManager.getActiveConfig());
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
    Log.info('Finished splitting meta');
  }
  
  /**
   * Metadata Merge
   * 
   * Merge a bunch of xml files with the same root element into a bundle.
   */
  async merge(paramIn = null, paramOut = null, force = null) {
    await MergeMeta(paramIn, paramOut, force, this.ConfigManager.getActiveConfig());
    Log.info('Finished merging meta');
  }
}

module.exports = Davos;
