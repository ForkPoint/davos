/** Events */
const events = {
    JOB_RESET: 'job:reset',
    JOB_STATUS: 'job:status',
    JOB_SET: 'job:set',
    TOKEN_FOUND: 'token:found'
};

/**
 * Modules
 */
const sfcc = require('sfcc-ci');
const instance = sfcc.instance;
const job = sfcc.job;
const chalk = require('chalk');

/**
 * Internal modules
 */
const Log = require('./logger');
const Utils = require('./util');

const DEFAULT_OCAPI_VERSION = 'v19_5'; // should possibly move to configuration
const SITE_IMPORT_JOB_ID = 'sfcc-site-archive-import';
const JobStatusURL = 's/-/dw/data/v19_5/jobs/sfcc-site-archive-import/executions';

/**
 * SFCC Manager Class
 */
class SFCCManager {
    constructor(config) {
        this.config = config;
        this.token = '';
        this.jobID = '';
        this.jobExecutionID = '';
    }

    SetToken(token) {
        this.token = token;
    }

    async Upload(arrayGlob) {
        const meta = await Utils.getMetaArchive(arrayGlob, this.config);
        const tempDir = Utils.getTempDir(this.config);
        const filePath = `${Utils.getCurrentRoot()}/${tempDir}/${meta}`;

        instance.upload(this.config.hostname, filePath, this.token, {}, (err) => {
            if (err) {
                Log.error('Error while uploading...');
                return;
            }

            Log.info('Upload successfull');
            Utils.deleteArchive(meta, '', this.config);
        });
    }

    Import(fileName) {
        const archiveName = fileName || Utils.getArchiveName(this.config);
        const self = this;

        instance.import(this.config.hostname, archiveName, this.token, (err, result) => {
            if (err) {
                if (result && result.fault) {
                    Log.error(`Could not start job. HTTP ${err.status}`);
                    self.ResetCurrentJob();
                    return;
                }

                Log.error(`Could not start job: ${err}`);
                self.ResetCurrentJob();
                return;
            } else if (result === undefined) {
                Log.error(`Could not start job: ${err}`);
                self.ResetCurrentJob();
                return;
            } else {
                this.SetCurrentJob(result);
                this.GetJobStatus();
            }
        });
    }

    ResetCurrentJob() {
        this.jobID = '';
        this.jobExecutionID = '';
    }

    SetCurrentJob(status) {
        this.jobID = status.job_id;
        this.jobExecutionID = status.id;
    }

    ListImportJobs() {
        const ReqMgr = require('./request-manager');
        const options = {
            baseUrl: `https://'${this.config.hostname}/${JobStatusURL}?client_id=${this.config['client-id']}`,
            uri: '/',
            contentString: null,
            auth: {
              user: this.config.username,
              password: this.config.password
            },
            timeout: 60000
          };
        const RequestManager = new ReqMgr(options, this.config);
        RequestManager.doRequest({}, 3);
    }

    GetJobStatus() {
        if (!this.jobID || !this.jobExecutionID) {
            Log.warn('No job is currently executing...');
            return;
        }

        job.status(this.config.hostname, this.jobID, this.jobExecutionID, this.token, this.ListJobStatus);
    }

    /** Lists the status of the current executing job */
    ListJobStatus(err, result) {
        const { status } = result;

        if (err) {
            const fault = result.fault;

            if (fault) {
                if (fault.type === 'InvalidAccessTokenException') {
                    // renew token ?
                    Log.error('Invalid token.');
                    return;
                }
    
                Log.error(`Error monitoring job: ${fault.message}`);
                return;
            }

            Log.error(`Error monitoring job: ${err}`);
            return;
        }

        switch(status) {
            case 'RUNNING':
                Log.info('Job running...');
                break;
            case 'ERROR':
                Log.error('Job finished with status "Error". Please check job history');
                ResetCurrentJob();
                break;
            default:
                Log.info(`Job finished! Status: ${status}`);
                ResetCurrentJob();
        }
    }

    Authenticate() {
        const self = this;
        const sfccAuth = sfcc.auth;
        const clientID = this.config['client-id'];
        const clientSecret = this.config['client-secret'];

        return new Promise((res, rej) => {
            sfccAuth.auth(clientID, clientSecret, function (err, token) {
                if (token) {
                    Log.info(`Authentication succeeded. Token is ${chalk.cyan(token)}`);

                    self.SetToken(token);
                    res();
                }
                if (err) {
                    Log.error(`Authentication error: ${err}`);

                    rej(err);
                }
            });
        });
    }
}

module.exports = SFCCManager;
