'use strict';

// Imports
const _ = require('underscore'),
  cheerio = require('cheerio'),
  moment = require('moment');

class BMTools {
  constructor () {
    this.lastCsrfToken = null;
    return this;
  }

  /**
   * Determines if a process is logged in order not.
   * {Usage} - request a business manager page via the request class, pass response body to this function to determine log in state.
   *
   * @TODO must be refactored in more comprehendable way
   *
   * @param {string} body - Represents the html page body text.
   * @return {bool} - result of login check
   */
  isLoggedIn (body) {
    //we must check an text element on the page to determine if we are logged in or not
    return (!body || body.indexOf('You are currently not logged in') === -1);
  }

  isValidRequest (body) {
    return (!body || body.indexOf('The request was not validated') === -1);
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

    const matches = body.match(/\'csrf_token\',\n\'(.*)\',/);

    if (matches && matches[1] && matches[1].length >= 20) {
      this.lastCsrfToken = matches[1];
    }
  }

  appendCSRF (url) {
    if (this.lastCsrfToken) {
      url = (url.indexOf('?') === -1) ? `${url  }?` : `${url  }&`;
      url += `csrf_token=${  this.lastCsrfToken}`;
    }
    return url;
  }

  /**
   * Parses the HTML body to find the import jobs of the desired name.
   * The most recently created job is returned.
   */
  parseBody (body, options) {
    const self = this;

    if (!this.isLoggedIn(body)) {
      throw 'Not able to login into business manager';
    }

    if (!options.selector) {
      throw 'Unable to retrieve process element, no selector defined';
    }

    // check if export zip is available by parsing dom.
    const $ = cheerio.load(body),
        $table = $(options.selector);

    // sort by start date and pick the last record
    const result = _.last(
      _.sortBy(
        self.filterRecords(
          self.parseTable($, $table),
          options
        ),
        'start'
      )
    );

    return result;
  }

  /**
   * Filters out records and keeps only the ones with the desired name.
   */
  filterRecords (records, options) {
    const self = this;

    if (!options.archiveName) {
      throw 'Archive name was not provided';
    }

    if (!options.processLabel) {
      throw 'Archive label not provided';
    }

    const textToFind = this.removeAllWhiteSpaces(options.processLabel.replace('{0}', options.archiveName));

    return _.filter(records, (record) => {
      return self.removeAllWhiteSpaces(record.name) === textToFind;
    });
  }

  /**
   * Parses the HTML table containing the import jobs.
   * Returns an array of objects describing the jobs.
   */
  parseTable ($, $table) {
    const self = this;

    return $table.find('tr').map(function() {
      return self.parseRow($, $(this));
    });
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
    const self = this;

    const $cells = $row.find('td');

    // has to be 5 columns otherwise it's not what we're looking for
    if (!$cells || $cells.length !== 5) {
      return null;
    }

    /**
     * Small utility function to get the (trimmed) text of a table cell.
     */
    const cellText = function(index) {
      const $cell = $($cells.get(index));
      return $cell.text().trim();
    };

    // get the start date as a text 7/21/15 10:19:13 am
    const startAsText = cellText(2);

    // parse it into an array of its components
    const startAsArray = this.parseStartDate(startAsText);

    // create a moment instance
    const startAsMoment = moment(startAsArray);

    // format it into a sortable string (2015-07-21T10:19:13)
    const startAsSortableText = startAsMoment.format('YYYY-MM-DDTHH:mm:ss');

    const name = cellText(1),
        start = startAsSortableText,
        duration = cellText(3),
        status = cellText(4);

    return {
      name,
      start,
      duration,
      status,
      isRunning: status === 'Running',
      isFinished: status.indexOf('Finished') === 0 || status.indexOf('Success') === 0 || status.indexOf('Error') === 0,
      isError: status.indexOf('Error') === 0,
      dataErrors: self.parseDataErrors(status)
    };
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
    const regex = /(\d+)\/(\d+)\/(\d+)[\s\S]+?(\d+):(\d+):(\d+) (\w+)/;
    const match = regex.exec(startDate);
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
    const regex = /(\d+) data errors/;
    const match = regex.exec(status);
    if (!match) {
      return 0;
    }

    return parseInt(match[1], 10);
  }
}

module.exports = BMTools;

