(function () {
  'use strict';

  // Constants
  const MAX_ATTEMPTS = 3,
    RETRY_DELAY = 300,
    REQUEST_TIMEOUT = 15000;

  // Imports
  const request = require('request'),
    chalk = require('chalk');

  // Locals
  const ConfigManager = require('./config-manager'),
    RequestManager = require('./request-manager'),
    BMTools = require('./bm-tools'),
    Log = require('./logger');

  /**
   * A WebDav client realizing DELETE, PUT, UNZIP, MKCOL, PROPFIND
   * @param {Object} config The configuration object used by Davos
   */
  class BM {
    constructor(config, ConfigManagerInstance) {
      this.ConfigManager = ConfigManagerInstance || new ConfigManager();
      this.config = (Object.keys(this.ConfigManager.config).length === 0)
        ? this.ConfigManager.loadConfiguration().getActiveProfile(config)
        : this.ConfigManager.mergeConfiguration(config);

      this.options = {
        method: 'POST',
        baseUrl: 'https://' + this.config.hostname + '/on/demandware.store/Sites-Site/default',
        uri: '/',
        contentString: null,
        jar: request.jar(),
        ignoreErrors: true,
        followAllRedirects: true
      };

      this.bmTools = new BMTools();
      this.reqMan = new RequestManager(this.options, this.ConfigManager);

      return this;
    }

    getCheckProgressConfig(type) {
      switch (type) {
        case "site":
          return {
            uri: '/ViewSiteImpex-Status',
            max_attempts: 100,
            max_import_attempts: 1,
            retry_delay: 1000,
            selector: '#unitSelection ~ table:nth-of-type(3)',
            label: 'Site Import ({0})'
          };
        case "metaValidation":
          return {
            uri: "/ViewCustomizationImpex-Start",
            max_attempts: 100,
            max_import_attempts: 1,
            retry_delay: 1000,
            selector: 'form[name="ImpexForm"] > table:nth-child(6)',
            label: 'Meta Data Validation <{0}>'
          }
        case "metaImport":
          return {
            uri: "/ViewCustomizationImpex-Start",
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
        .then(function (body) {
          return Promise.resolve(body);
        }, function (err) {
          return Promise.reject(err);
        });
    }

    /**
     * HTTP Request BM LOGIN
     */
    login() {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          uri: '/ViewApplication-ProcessLogin',
          form: {
            LoginForm_Login: self.config.username,
            LoginForm_Password: self.config.password,
            LoginForm_RegistrationDomain: 'Sites'
          }
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function (body) {
            if (!self.bmTools.isLoggedIn(body)) {
              let e = new Error('Not able to login into business manager.')
              return reject(e);
            }

            self.bmTools.parseCsrfToken(body);

            resolve();
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * HTTP Request BM ENSURE NO IMPORT
     */
    ensureNoImport(archiveName) {
      const self = this;
      const SITE_IMPORT = this.getCheckProgressConfig("site");

      return new Promise(function (resolve, reject) {
        let options = {
          uri: self.bmTools.appendCSRF('/ViewSiteImpex-Status')
        };

        if (archiveName === undefined || archiveName.length < 1) {
          let e = new Error('Invalid archive name.');
          return reject(e);
        }

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function (body) {
            if (!self.bmTools.isLoggedIn(body)) {
              let e = new Error('Not authenticated.');
              return reject(e);
            }

            self.bmTools.parseCsrfToken(body);

            let job = self.bmTools.parseBody(body, {
              archiveName: archiveName,
              selector: SITE_IMPORT.selector,
              processLabel: SITE_IMPORT.label
            });

            if (job && job.isRunning) {
              let e = new Error('Import already running! Duration: ' + job.duration);
              return reject(e);
            }

            resolve();
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * HTTP Request BM IMPORT SITES
     */
    importSites(archiveName, attemptsLeft) {
      const self = this;
      const SITE_IMPORT = this.getCheckProgressConfig("site");

      if (attemptsLeft === undefined) {
        attemptsLeft = SITE_IMPORT.max_import_attempts;
      }

      return new Promise(function (resolve, reject) {
        let options = {
          uri: self.bmTools.appendCSRF('/ViewSiteImpex-Dispatch'),
          form: {
            ImportFileName: archiveName,
            import: 'OK',
            realmUse: 'false'
          }
        };

        if (archiveName === undefined || archiveName.length < 1) {
          let e = new Error('Invalid archive name.');
          return reject(e);
        }

        if (attemptsLeft < 1) {
          let e = new Error('Maximum retries reached. Unable to import site.');
          return reject(e);
        }

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function (body) {
            if (!self.bmTools.isLoggedIn(body)) {
              let e = new Error('Not authenticated.');
              return reject(e);
            }
            self.bmTools.parseCsrfToken(body);
            if (!self.bmTools.isValidRequest(body)) {
              Log.info(chalk.cyan('The request was not validated. Retrying with new csrf token.'));
              (function () {
                return new Promise(function (retryResolve, retryReject) {
                  setTimeout(function () {
                    retryResolve();
                  }, SITE_IMPORT.retry_delay);
                });
              })().then(function () {
                return self.importSites(archiveName, --attemptsLeft);
              }).then(function () {
                resolve();
              }, function (err) {
                reject(err);
              });
            } else {
              resolve();
            }
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * HTTP Request BM CHECK IMPORT PROGRESS
     */
    checkImportProgress(archiveName, attemptsLeft, importConfig = "site") {
      const self = this;
      const config = this.getCheckProgressConfig(importConfig);

      if (attemptsLeft === undefined) {
        attemptsLeft = config.max_attempts;
      }

      return new Promise(function (resolve, reject) {
        let options = {
          uri: self.bmTools.appendCSRF(config.uri)
        };

        if (archiveName === undefined || archiveName.length < 1) {
          let e = new Error('Invalid archive name.');
          return reject(e);
        }

        if (attemptsLeft < 1) {
          let e = new Error('Maximum retries reached. Login to BM for more details.');
          return reject(e);
        }

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function (body) {
            if (!self.bmTools.isLoggedIn(body)) {
              let e = new Error('Not authenticated.');
              return reject(e);
            }

            self.bmTools.parseCsrfToken(body);

            let job = self.bmTools.parseBody(body, {
              archiveName: archiveName,
              selector: config.selector,
              processLabel: config.label
            });

            if (!job) {
              let e = new Error('Could not find import job.');
              return reject(e);
            }

            if (job.isRunning) {
              Log.info(chalk.cyan('Job still running. Execution time: ' + job.duration));
              (function () {
                return new Promise(function (retryResolve, retryReject) {
                  setTimeout(function () {
                    retryResolve();
                  }, config.retry_delay);
                });
              })().then(function () {
                return self.checkImportProgress(archiveName, --attemptsLeft);
              }).then(function () {
                resolve();
              }, function (err) {
                reject(err);
              });
            } else if (job.isError) {
              let e = new Error('Import failed! Login to BM for more details.');
              return reject(e);
            } else if (job.isFinished) {
              Log.info(chalk.cyan('Finished. ' + (job.dataErrors || 'No') + ' data errors. Duration: ' + job.duration));
              return resolve();
            } else {
              let e = new Error('Unexpected state!');
              return reject(e);
            }
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * HTTP Request ACTIVATE CODE VERSION
     */
    activateCodeVersion() {
      const self = this;
      
      return new Promise(function (resolve, reject) {
        let options = {
          uri: self.bmTools.appendCSRF('/ViewCodeDeployment-Activate'),
          form: {
            CodeVersionID: self.config.codeVersion
          }
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * WebDav Request Upload Sites Meta
     */
    uploadSitesArchive(path) {
      return this.uploadImpex(path, "/src/instance");
    }

    uploadMeta(path) {
      return this.uploadImpex(path, "/src/customization");
    }

    uploadImpex(path, location) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'PUT',
          baseUrl: 'https://' + self.config.hostname + '/on/demandware.servlet/webdav/Sites/Impex' + location,
          uri: path,
          auth: {
            user: self.config.username,
            password: self.config.password
          },
          jar: false,
          timeout: REQUEST_TIMEOUT,
          fromTmpDir: true
        };

        self.doRequest(options, MAX_ATTEMPTS, RETRY_DELAY)
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
      });
    }

    /**
     * WebDav Request Delete Sites Meta
     */
    deleteSitesArchive(path) {
      return this.deleteImpex(path, "/src/instance");
    }

    deleteMeta(path) {
      return this.deleteImpex(path, "/src/customization");
    }

    deleteImpex(path, location) {
      const self = this;

      return new Promise(function (resolve, reject) {
        let options = {
          method: 'DELETE',
          baseUrl: 'https://' + self.config.hostname + '/on/demandware.servlet/webdav/Sites/Impex' + location,
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
          .then(function () {
            resolve();
          }, function (err) {
            reject(err);
          });
      });
    }

    validateMetaImport(filename) {
      let options = {
        uri: this.bmTools.appendCSRF("/ViewCustomizationImport-Dispatch"),
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
      var cheerio = require('cheerio'),
        self = this;

      /**
       * Selects the first completed validation for import
       */
      function selectValidationJob(body) {
        var $ = cheerio.load(body);

        if (!self.bmTools.isLoggedIn(body)) {
          throw 'Not able to login into business manager';
        }

        self.bmTools.parseCsrfToken(body);

        // Check if validation has been done on this file: Prepare label text
        var archiveLabel = 'Meta Data Validation <{0}>'.replace('{0}', filename),
          $td = $('form[name="ImpexForm"] > table:nth-child(6) > tr > td:nth-child(2)'),
          importLink;

        // Compare target label text with actual result, strip whitespace (to ignore line breaks etc.)
        var record = $td.filter(function () {
          var normalizedTargetLabel = self.bmTools.removeAllWhiteSpaces(archiveLabel);
          var normalizedActualLabel = self.bmTools.removeAllWhiteSpaces($(this).text());

          return normalizedActualLabel === normalizedTargetLabel;
        });

        if (!record || record.length === 0) {
          throw 'No validation task found for ' + filename;
        }

        importLink = $(record).find('.selection_link').first().attr('href');

        Log.info(chalk.cyan('Found validation task'));

        // Go to validation form page in order to execute import process
        return self.doRequest({
          baseUrl: self.bmTools.appendCSRF(importLink),
          uri: ""
        }).then(importMeta);
      }
      /**
       * Execute meta data import for the validation file
       */
      function importMeta(body) {
        var $ = cheerio.load(body);

        self.bmTools.parseCsrfToken(body);

        // if confirm import is disabled this validation import is invalid
        if ($('button[name="confirmImport"]').attr('disabled')) {
          throw 'Validation errors have been found, unable to import';
        }

        var formAction = $('form[name="ValidateFileForm"]').attr('action'),
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
          uri: "",
          form: form
        });
      }

      return this.doRequest({
        uri: this.bmTools.appendCSRF(this.getCheckProgressConfig("metaImport").uri)
      }).then(selectValidationJob);
    }
  }

  module.exports = BM;
}());
