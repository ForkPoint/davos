(function () {
  'use strict';

  // Imports
  const _ = require('underscore'),
    fs = require('fs'),
    path = require('path');

  // Locals
  const Log = require('./logger');

  class BMTools {
    constructor () {
      this.lastCsrfToken = null;
      this.isAuth = false;
      return this;
    }

    /**
     * Determines if a process is logged in.
     * {Usage} - request a business manager page via the request class, pass response body to this function to determine log in state.
     *
     * @param {string} body - Represents the html page body text.
     * @return {bool} - result of login check
     */
    isLoggedIn (body) {
        //we must check an text element on the page to determine if we are logged in or not
        return (body && body.indexOf('You are currently not logged in') > -1);
    }

    /**
     * remove all space and white spaces from string, This is used to compare demandware bm tag elements with
     * string tags which have random white spacing
     * @param {string} text - the text to remove spaces from
     * @return {String} - The formatted text
     */
    removeAllWhiteSpaces (text) {
        return (text || '').replace(/\s/g, '');
    }

    parseCsrfToken (body) {
        if (!body || !body.includes('csrf_token')) {
            return;
        }

        var matches = body.match(/\'csrf_token\',\n\'(.*)\',/);

        if (matches && matches[1] && matches[1].length >= 20) {
            this.lastCsrfToken = matches[1];
        }
    }

    appendCSRF (url) {
        if (this.lastCsrfToken) {
            url = (url.indexOf('?') === -1) ? url + '?' : url + '&';
            url += 'csrf_token=' + this.lastCsrfToken;
        }

        return url;
    }

    /**
     * Parses the HTML body to find the import jobs of the desired name.
     * The most recently created job is returned.
     */
    parseBody (body, options) {
        if (!bmUtils.isLoggedIn(body)) {
            throw 'Not able to login into business manager';
        }

        if (!options.selector) {
            throw 'Unable to retrieve process element, no selector defined';
        }

        // check if export zip is available by parsing dom.
        var $ = cheerio.load(body),
            $table = $(options.selector);

        // sort by start date and pick the last record
        var result = _.last(
            _.sortBy(
                filterRecords(
                    parseTable($, $table),
                    options),
                'start'));

        return result;
    }

    /**
     * Parse the start date of an import job.
     * The date is rendered in the HTML as 7/21/15 10:19:13 am,
     * but the space between year and hour can be actually a '&nbsp;'.
     *
     * Returns an array with the date time components in the order:
     * year, month, day, hour, minute, second.
     */
    parseStartDate (startDate) {
        var regex = /(\d+)\/(\d+)\/(\d+)[\s\S]+?(\d+):(\d+):(\d+) (\w+)/;
        var match = regex.exec(startDate);
        if (!match) {
            return null;
        }

        return [

            // year + 2000
            2000 + parseInt(match[3], 10),

            // month - 1 because in javascript month is zero-based index
            parseInt(match[1], 10) - 1,

            // day
            parseInt(match[2], 10),

            // hour + 12 if pm
            parseInt(match[4], 10) + (match[7] === 'pm' ? 12 : 0),

            // minute
            parseInt(match[5], 10),

            // seconds
            parseInt(match[6], 10)
        ];
    }

    /**
     * Parses the data errors string to determine how many data errors, if any, existed.
     * This string is something like 'Finished (1 data errors)'.
     */
    parseDataErrors (status) {
        var regex = /(\d+) data errors/;
        var match = regex.exec(status);
        if (!match) {
            return 0;
        }

        return parseInt(match[1], 10);
    }

    /**
     * Parses the HTML of a table row that shows an import job.
     * Returns an object that contains the fields:
     * - name: the name of the job
     * - start: the date when the job was started as a string in a sortable format
     * - duration: the duration of the job
     * - status: the status of the job
     * - isRunning: true if the job is still running
     * - isFinished: true if the job has executed
     * - isError: true if the job had failed
     * - dataErrors: the number of data errors in the job
     */
    parseRow ($, $row) {
        var $cells = $row.find('td');

        // has to be 5 columns otherwise it's not what we're looking for
        if (!$cells || $cells.length !== 5) {
            return null;
        }

        /**
         * Small utility function to get the (trimmed) text of a table cell.
         */
        var cellText = function(index) {
            var $cell = $($cells.get(index));
            return $cell.text().trim();
        };

        // get the start date as a text 7/21/15 10:19:13 am
        var startAsText = cellText(2);

        // parse it into an array of its components
        var startAsArray = parseStartDate(startAsText);

        // create a moment instance
        var startAsMoment = moment(startAsArray);

        // format it into a sortable string (2015-07-21T10:19:13)
        var startAsSortableText = startAsMoment.format('YYYY-MM-DDTHH:mm:ss');

        var name = cellText(1),
            start = startAsSortableText,
            duration = cellText(3),
            status = cellText(4);

        return {
            name: name,
            start: start,
            duration: duration,
            status: status,
            isRunning: status === 'Running',
            isFinished: status.indexOf('Finished') === 0 || status.indexOf('Success') === 0 || status.indexOf('Error') === 0,
            isError: status.indexOf('Error') === 0,
            dataErrors: parseDataErrors(status)
        };
    }

    /**
     * Parses the HTML table containing the import jobs.
     * Returns an array of objects describing the jobs.
     */
    parseTable ($, $table) {
        return $table.find('tr').map(function() {
            return parseRow($, $(this));
        });
    }

    /**
     * Filters out records and keeps only the ones with the desired name.
     */
    filterRecords (records, options) {
        if (!options.archiveName) {
            throw 'Archive name was not provided';
        }

        if (!options.processLabel) {
            throw 'Archive label not provided';
        }

        var textToFind = bmUtils.removeAllWhiteSpaces(options.processLabel.replace('{0}', options.archiveName));
        return _.filter(records, function(record) {
            return bmUtils.removeAllWhiteSpaces(record.name) === textToFind;
        });
    }
  };

  module.exports = BMTools;
}());
