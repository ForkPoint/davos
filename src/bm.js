'use strict';

/** Constants */
const MAX_ATTEMPTS = 3,
  RETRY_DELAY = 300,
  REQUEST_TIMEOUT = 15000;

/** Modules */
const request = require('request');
const chalk = require('chalk');

/** Internal modules */
const RequestManager = require('./request-manager');
const BMTools = require('./bm-tools');
const Log = require('./logger');

/**
 * A WebDav client realizing DELETE, PUT, UNZIP, MKCOL, PROPFIND
 * @param {Object} config The configuration object used by Davos
 */
class BM {
  constructor(config) {
    this.config = config;

    this.options = {
      method: 'POST',
      baseUrl: `https://${  this.config.hostname  }/on/demandware.store/Sites-Site/default`,
      uri: '/',
      contentString: null,
      jar: request.jar(),
      ignoreErrors: true,
      followAllRedirects: true
    };

    this.bmTools = new BMTools();
    this.reqMan = new RequestManager(this.options, this.config);

    return this;
  }

  getCheckProgressConfig(type) {
    switch (type) {
      case 'site':
        return {
          uri: '/ViewSiteImpex-Status',
          max_attempts: 100,
          max_import_attempts: 1,
          retry_delay: 1000,
          selector: '#unitSelection ~ table:nth-of-type(3)',
          label: 'Site Import ({0})'
        };
      case 'metaValidation':
        return {
          uri: '/ViewCustomizationImpex-Start',
          max_attempts: 100,
          max_import_attempts: 1,
          retry_delay: 1000,
          selector: 'form[name="ImpexForm"] > table:nth-child(6)',
          label: 'Meta Data Validation <{0}>'
        }
      case 'metaImport':
        return {
          uri: '/ViewCustomizationImpex-Start',
          max_attempts: 100,
          max_import_attempts: 1,
          retry_delay: 1000,
          selector: 'form[name="ImpexForm"] > table:nth-child(6)',
          label: 'Meta Data Import <{0}>'
        }
    }
  }

  doRequest(options, attemptsLeft = MAX_ATTEMPTS, retryDelay = RETRY_DELAY) {
    return this.reqMan.doRequest(options, attemptsLeft, retryDelay)
      .then((body) => {
        return Promise.resolve(body);
      }, (err) => {
        return Promise.reject(err);
      });
  }

  /**
   * HTTP Request BM LOGIN
   */
  login() {
    const self = this;

    return new Promise(((resolve, reject) => {
      const options = {
        uri: '/ViewApplication-ProcessLogin',
        form: {
          LoginForm_Login: self.config.username,
          LoginForm_Password: self.config.password,
          LoginForm_RegistrationDomain: 'Sites'
        }
      };

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then((body) => {
          if (!self.bmTools.isLoggedIn(body)) {
            const e = new Error('Not able to login into business manager.')
            return reject(e);
          }

          self.bmTools.parseCsrfToken(body);

          resolve();
        }, (err) => {
          reject(err);
        });
    }));
  }

  /**
   * HTTP Request BM ENSURE NO IMPORT
   */
  ensureNoImport(archiveName) {
    const self = this;
    const SITE_IMPORT = this.getCheckProgressConfig('site');

    return new Promise(((resolve, reject) => {
      const options = {
        uri: self.bmTools.appendCSRF('/ViewSiteImpex-Status')
      };

      if (archiveName === undefined || archiveName.length < 1) {
        const e = new Error('Invalid archive name.');
        return reject(e);
      }

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then((body) => {
          if (!self.bmTools.isLoggedIn(body)) {
            const e = new Error('Not authenticated.');
            return reject(e);
          }

          self.bmTools.parseCsrfToken(body);

          const job = self.bmTools.parseBody(body, {
            archiveName,
            selector: SITE_IMPORT.selector,
            processLabel: SITE_IMPORT.label
          });

          if (job && job.isRunning) {
            const e = new Error(`Import already running! Duration: ${  job.duration}`);
            return reject(e);
          }

          resolve();
        }, (err) => {
          reject(err);
        });
    }));
  }

  /**
   * HTTP Request BM IMPORT SITES
   */
  importSites(archiveName, attemptsLeft) {
    const self = this;
    const SITE_IMPORT = this.getCheckProgressConfig('site');

    if (attemptsLeft === undefined) {
      attemptsLeft = SITE_IMPORT.max_import_attempts;
    }

    return new Promise(((resolve, reject) => {
      const options = {
        uri: self.bmTools.appendCSRF('/ViewSiteImpex-Dispatch'),
        form: {
          ImportFileName: archiveName,
          import: 'OK',
          realmUse: 'false'
        }
      };

      if (archiveName === undefined || archiveName.length < 1) {
        const e = new Error('Invalid archive name.');
        return reject(e);
      }

      if (attemptsLeft < 1) {
        const e = new Error('Maximum retries reached. Unable to import site.');
        return reject(e);
      }

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then((body) => {
          if (!self.bmTools.isLoggedIn(body)) {
            const e = new Error('Not authenticated.');
            return reject(e);
          }
          self.bmTools.parseCsrfToken(body);
          if (!self.bmTools.isValidRequest(body)) {
            Log.info(chalk.cyan('The request was not validated. Retrying with new csrf token.'));
            (function () {
              return new Promise(((retryResolve, retryReject) => {
                setTimeout(() => {
                  retryResolve();
                }, SITE_IMPORT.retry_delay);
              }));
            })().then(() => {
              return self.importSites(archiveName, --attemptsLeft);
            }).then(() => {
              resolve();
            }, (err) => {
              reject(err);
            });
          } else {
            resolve();
          }
        }, (err) => {
          reject(err);
        });
    }));
  }

  /**
   * HTTP Request BM CHECK IMPORT PROGRESS
   */
  checkImportProgress(archiveName, attemptsLeft, importConfig = 'site') {
    const self = this;
    const config = this.getCheckProgressConfig(importConfig);

    if (attemptsLeft === undefined) {
      attemptsLeft = config.max_attempts;
    }

    return new Promise(((resolve, reject) => {
      const options = {
        uri: self.bmTools.appendCSRF(config.uri)
      };

      if (archiveName === undefined || archiveName.length < 1) {
        const e = new Error('Invalid archive name.');
        return reject(e);
      }

      if (attemptsLeft < 1) {
        const e = new Error('Maximum retries reached. Login to BM for more details.');
        return reject(e);
      }

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then((body) => {
          if (!self.bmTools.isLoggedIn(body)) {
            const e = new Error('Not authenticated.');
            return reject(e);
          }

          self.bmTools.parseCsrfToken(body);

          const job = self.bmTools.parseBody(body, {
            archiveName,
            selector: config.selector,
            processLabel: config.label
          });

          if (!job) {
            const e = new Error('Could not find import job.');
            return reject(e);
          }

          if (job.isRunning) {
            Log.info(chalk.cyan(`Job still running. Execution time: ${  job.duration}`));
            (function () {
              return new Promise(((retryResolve, retryReject) => {
                setTimeout(() => {
                  retryResolve();
                }, config.retry_delay);
              }));
            })().then(() => {
              return self.checkImportProgress(archiveName, --attemptsLeft);
            }).then(() => {
              resolve();
            }, (err) => {
              reject(err);
            });
          } else if (job.isError) {
            const e = new Error('Import failed! Login to BM for more details.');
            return reject(e);
          } else if (job.isFinished) {
            Log.info(chalk.cyan(`Finished. ${  job.dataErrors || 'No'  } data errors. Duration: ${  job.duration}`));
            return resolve();
          } else {
            const e = new Error('Unexpected state!');
            return reject(e);
          }
        }, (err) => {
          reject(err);
        });
    }));
  }

  /**
   * HTTP Request ACTIVATE CODE VERSION
   */
  activateCodeVersion() {
    const self = this;
    
    return new Promise(((resolve, reject) => {
      const options = {
        uri: self.bmTools.appendCSRF('/ViewCodeDeployment-Activate'),
        form: {
          CodeVersionID: self.config.codeVersion
        }
      };

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then(() => {
          resolve();
        }, (err) => {
          reject(err);
        });
    }));
  }

  /**
   * WebDav Request Upload Sites Meta
   */
  uploadSitesArchive(path) {
    return this.uploadImpex(path, '/src/instance');
  }

  uploadMeta(path) {
    return this.uploadImpex(path, '/src/customization');
  }

  uploadImpex(path, location) {
    const self = this;

    return new Promise(((resolve, reject) => {
      const options = {
        method: 'PUT',
        baseUrl: `https://${  self.config.hostname  }/on/demandware.servlet/webdav/Sites/Impex${  location}`,
        uri: path,
        // change auth to bearer and token ?
        auth: {
          user: self.config.username,
          password: self.config.password
        },
        jar: false,
        timeout: REQUEST_TIMEOUT,
        fromTmpDir: true
      };

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then(() => {
          resolve();
        }, (err) => {
          reject(err);
        });
    }));
  }

  /**
   * WebDav Request Delete Sites Meta
   */
  deleteSitesArchive(path) {
    return this.deleteImpex(path, '/src/instance');
  }

  deleteMeta(path) {
    return this.deleteImpex(path, '/src/customization');
  }

  deleteImpex(path, location) {
    const self = this;

    return new Promise(((resolve, reject) => {
      const options = {
        method: 'DELETE',
        baseUrl: `https://${  self.config.hostname  }/on/demandware.servlet/webdav/Sites/Impex${  location}`,
        uri: path,
        contentString: null,
        auth: {
          user: self.config.username,
          password: self.config.password
        },
        jar: false,
        timeout: REQUEST_TIMEOUT
      };

      self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
        .then(() => {
          resolve();
        }, (err) => {
          reject(err);
        });
    }));
  }

  validateMetaImport(filename) {
    const options = {
      uri: this.bmTools.appendCSRF('/ViewCustomizationImport-Dispatch'),
      form: {
        SelectedFile: filename,
        ProcessPipelineName: 'ProcessObjectTypeImport',
        ProcessPipelineStartNode: 'Validate',
        JobDescription: 'Validate+custommeta+data+definitions',
        JobName: 'ProcessObjectTypeImpex',
        validate: ''
      },
      timeout: REQUEST_TIMEOUT
    };

    return this.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY);
  }

  importMeta(filename) {
    const cheerio = require('cheerio'),
      self = this;

    /**
     * Selects the first completed validation for import
     */
    function selectValidationJob(body) {
      const $ = cheerio.load(body);

      if (!self.bmTools.isLoggedIn(body)) {
        throw 'Not able to login into business manager';
      }

      self.bmTools.parseCsrfToken(body);

      // Check if validation has been done on this file: Prepare label text
      let archiveLabel = 'Meta Data Validation <{0}>'.replace('{0}', filename),
        $td = $('form[name="ImpexForm"] > table:nth-child(6) tr > td:nth-child(2)'),
        importLink;

      // Compare target label text with actual result, strip whitespace (to ignore line breaks etc.)
      const record = $td.filter(function () {
        const normalizedTargetLabel = self.bmTools.removeAllWhiteSpaces(archiveLabel);
        const normalizedActualLabel = self.bmTools.removeAllWhiteSpaces($(this).text());

        return normalizedActualLabel === normalizedTargetLabel;
      });

      if (!record || record.length === 0) {
        throw `No validation task found for ${  filename}`;
      }

      importLink = $(record).find('.selection_link').first().attr('href');

      Log.info(chalk.cyan('Found validation task'));

      // Go to validation form page in order to execute import process
      return self.doRequest({
        baseUrl: self.bmTools.appendCSRF(importLink),
        uri: ''
      }).then(importMeta);
    }
    /**
     * Execute meta data import for the validation file
     */
    function importMeta(body) {
      const $ = cheerio.load(body);

      self.bmTools.parseCsrfToken(body);

      // if confirm import is disabled this validation import is invalid
      if ($('button[name="confirmImport"]').attr('disabled')) {
        throw 'Validation errors have been found, unable to import';
      }

      const formAction = $('form[name="ValidateFileForm"]').attr('action'),
        form = {
          SelectedFile: $('input[name="SelectedFile"]').attr('value'),
          JobConfigurationUUID: $('input[name="JobConfigurationUUID"]').attr('value'),
          ProcessPipelineName: $('input[name="ProcessPipelineName"]').attr('value'),
          ProcessPipelineStartNode: $('input[name="ProcessPipelineStartNode"]').attr('value'),
          JobName: $('input[name="JobName"]').attr('value'),
          startImport: '',
          // TODO possibly enable this, make customizable
          // ClearAttributeDefinitions: true
        };

      Log.info(chalk.cyan('Importing meta data file'));

      return self.doRequest({
        baseUrl: self.bmTools.appendCSRF(formAction),
        uri: '',
        form
      });
    }

    return this.doRequest({
      uri: this.bmTools.appendCSRF(this.getCheckProgressConfig('metaImport').uri)
    }).then(selectValidationJob);
  }
}

module.exports = BM;
