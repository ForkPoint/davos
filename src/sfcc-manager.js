'use strict';

/**
 * Modules
 */
const sfcc = require('sfcc-ci');
const {instance} = sfcc;
const {job} = sfcc;
const chalk = require('chalk');
const request = require('request');

/**
 * Internal modules
 */
const Log = require('./logger');
const Utils = require('./util');
const RequestHelper = require('./requestHelper');
const Constants = require('./constants');

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

    async Upload(file) {
        return new Promise((res, rej) => {
            instance.upload(this.config.hostname, file, this.token, {}, (err) => {
                if (err) {
                    Log.error('Error while uploading. Deleting archive...');
                    Utils.deleteArchive(file, '', this.config);
                    rej();
                    return;
                }

                Log.info('Upload successful');
                res();
            });
        }).catch(err => Log.error(err));
    }

    /**
     * - Should import the passed file name, uploaded to the instance
     * @param {string} File name
     */
    async Import(fileName, archivePath) {
        const self = this;
        const jobRunCheck = await this.IsJobRunning();

        /** If there is an already running job, stop */
        if (jobRunCheck) {
            Log.error('Import job is already running, cannot start new import...');
            /** Delete archive */
            Utils.deleteArchive(archivePath, '', this.config);
            return;
        }

        return new Promise((res, rej) => {
            instance.import(this.config.hostname, fileName, this.token, async (err, result) => {
                if (err) {
                    if (result && result.fault) {
                        Log.error(`Could not start job. HTTP ${err.status}`);
                        return;
                    }

                    Log.error(`Could not start job: ${err}`);
                    rej();
                    return;
                } else if (result === undefined) {
                    Log.error(`Could not start job: ${err}`);
                    rej();
                    return;
                } else {
                    const jobID = result.job_id;
                    const jobExecutionID = result.id;

                    Utils.deleteArchive(archivePath, '', self.config);

                    await new Promise((resolve, reject) => {
                        job.status(this.config.hostname, jobID, jobExecutionID, this.token, (err, result) => {
                            const { status } = result;

                            if (err) {
                                const {fault} = result;

                                if (fault) {
                                    if (fault.type === 'InvalidAccessTokenException') {
                                        // renew token ?
                                        Log.error('Invalid token.');
                                        reject();
                                        return;
                                    }

                                    Log.error(`Error monitoring job: ${fault.message}`);
                                    reject();
                                    return;
                                }

                                Log.error(`Error monitoring job: ${err}`);
                                reject();
                                return;
                            }

                            switch (status) {
                                case 'RUNNING':
                                    Log.info('Job running...');
                                    Log.info('Success');
                                    resolve();
                                    break;
                                case 'ERROR':
                                    reject('Job finished with status "Error". Please check job history');
                                    break;
                                default:
                                    Log.info(`Job finished! Status: ${status}`);
                                    Log.info('Success');
                                    resolve();
                            }
                        });
                    }).catch(err => Log.error(err));

                    res();
                }
            });
        }).catch(err => Log.error(err));
    }

    async IsJobRunning() {
        const accessToken = await RequestHelper.getAccessToken(this.config['client-id'], this.config['client-secret']);
        const body = {
            query: {
                term_query: {
                    fields: [
                        'job_id'
                    ],
                    operator: 'is',
                    values: [
                        Constants.SITE_IMPORT_JOB_ID
                    ]
                }
            }
        };
        const options = {
            baseUrl: `https://${this.config.hostname}/${Constants.JobExecutionSearch}?client_id=${this.config['client-id']}`,
            uri: '/',
            auth: { bearer: accessToken },
            body: JSON.stringify(body)
        };

        Log.info(`Access token granted: ${accessToken}`);
        Log.info('Checking for import job...');

        return new Promise((res, rej) => {
            request.post(options, (error, response, body) => {
                if (error) {
                    Log.error(error);
                    return;
                }

                const {hits} = JSON.parse(body);
                const running = hits.find((job) => job.status === 'RUNNING');

                try {
                    res(running);
                } catch (err) {
                    rej(err);
                }
            });
        }).catch(err => Log.error(err));
    }

    Authenticate() {
        const self = this;
        const sfccAuth = sfcc.auth;
        const clientID = this.config['client-id'];
        const clientSecret = this.config['client-secret'];

        Log.debug('Client id is: \n' + clientID +', secret ' + clientSecret);

        return new Promise((res, rej) => {
            sfccAuth.auth(clientID, clientSecret, (err, token) => {
                if (token) {
                    Log.info(`Authentication succeeded. Token is ${chalk.cyan(token)}`);

                    self.SetToken(token);
                    res();
                }
                if (err) {
                    Log.info('Authentication failed.');
                    Log.error(`Authentication error: ${err}`);

                    rej(err);
                }
            });
        }).catch(err => {
            Log.error('An error occurred while authenticating with OCAPI');
            Log.error(err);
        });
    }
}

module.exports = SFCCManager;
