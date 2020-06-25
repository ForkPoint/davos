/** Modules */
const request = require('request');
const fs = require('fs');
const prettifier = require('prettify-xml');

/** Internal modules */
const RequestHelper = require('../requestHelper');
const Log = require('../logger');
const util = require('../util');

const assetAttributeMap = {
    name: 'display-name',
    description: 'description',
    online: 'online-flag',
    searchable: 'searchable-flag',
    template: 'template'
};
const assetPageAttributesMap = {
    page_title: 'page-title',
    page_description: 'page-description',
    page_keywords: 'page-keywords',
    page_url: 'page-url',
};
const assetAttributeTypeMap = {
    markup_text: 'markup',
    media_file: 'path'
};

const assetSiteMapAttributesMap = {
    site_map_included: 'sitemap-included-flag',
    site_map_change_frequency: 'sitemap-changefrequency',
    site_map_priority: 'sitemap-priority',
}

function escapeHTML(s) {
    return s.replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function assetTemplateReplace(template, libraryID, assetJS) {
    const assetKeys = Object.keys(assetJS);
    let assetContent = '';
    let pageAttributes = {};
    let customAttributes = {};
    let siteMapAttributes = {};

    template = template.replace(/{{ libraryid }}/g, libraryID).replace(/{{ aid }}/g, assetJS.id);

    /** page and custom attributes */
    assetKeys.forEach((key) => {
        if (key.indexOf('page_') > -1) {
            pageAttributes[key] = assetJS[key];
        } else if (key.indexOf('c_') > -1) {
            customAttributes[key.replace('c_', '')] = assetJS[key];
        } else if (key.indexOf('site_map_') > -1) {
            siteMapAttributes[key] = assetJS[key];
        }
    });

    /** system attributes */
    Object.keys(assetAttributeMap).forEach((key) => {
        let value = '';

        if (assetJS[key]) {
            value = Object.prototype.hasOwnProperty.call(assetJS[key], 'default') ? assetJS[key].default : assetJS[key];
            assetContent += `<${assetAttributeMap[key]}>${value}</${assetAttributeMap[key]}>`;
        }
    });

    if (Object.keys(pageAttributes).length > 0) {
        assetContent += '<page-attributes>';

        Object.keys(assetPageAttributesMap).forEach((key) => {
            let value = '';
            
            if (assetJS[key]) {
                value = Object.prototype.hasOwnProperty.call(pageAttributes[key], 'default') ? pageAttributes[key].default : pageAttributes[key];
                assetContent += `<${assetPageAttributesMap[key]}>${value}</${assetPageAttributesMap[key]}>`;
            }
        });

        assetContent += '</page-attributes>';
    }

    /** custom attributes */
    if (Object.keys(customAttributes).length > 0) {
        assetContent += '<custom-attributes>';

        Object.keys(customAttributes).forEach((key) => {
            let value = Object.prototype.hasOwnProperty.call(customAttributes[key], 'default') ? customAttributes[key].default : customAttributes[key];

            if (typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, '_type')) {
                value = escapeHTML(value[assetAttributeTypeMap[value._type]]);
            }

            if (Array.isArray(value)) {
                assetContent += `<custom-attribute attribute-id="${key}">`;
                value.forEach((val) => {
                    assetContent += `<value>${val}</value>`;
                });
                assetContent += '</custom-attribute>';
            } else {
                /** format correctly the date for import */
                if (typeof value === 'string' && value.indexOf('000Z') > -1) {
                    value = value.replace('000Z', '000+0000');
                }
                assetContent += `<custom-attribute attribute-id="${key}">${value}</custom-attribute>`;
            }
        });

        assetContent += '</custom-attributes>';
    }

    /** add site map attributes, if present, last */
    if (Object.keys(siteMapAttributes).length > 0) {
        Object.keys(assetSiteMapAttributesMap).forEach((key) => {

            if (assetJS[key]) {
                let value = Object.prototype.hasOwnProperty.call(siteMapAttributes[key], 'default') ? siteMapAttributes[key].default : siteMapAttributes[key];
                assetContent += `<${assetSiteMapAttributesMap[key]}>${value}</${assetSiteMapAttributesMap[key]}>`;
            }
        });
    }

    template = template.replace('{{ objects }}', assetContent);

    return template;
}

async function downloadAsset(aid, libID, output, config) {
    const accessToken = await RequestHelper.getAccessToken(config['client-id'], config['client-secret']);

    const options = {
        baseUrl: `https://${config.hostname}/s/-/dw/data/v19_5/libraries/${libID}/content/${aid}?client_id=${config['client-id']}`,
        uri: '/',
        auth: { bearer: accessToken }
    };

    Log.info(`Access token granted: ${accessToken}`);
    Log.info('Attempting to get asset...');

    return await new Promise((res, rej) => {
        request.get(options, function (error, response, body) {
            let result = '';
            let path = '';
            let template = '';

            if (error) {
                Log.error(error);
                return;
            }

            try {
                if (body) {
                    template = util.getTemplate('contentasset');

                    Log.info('Asset obtained');

                    result = JSON.parse(body);
                    result = prettifier(assetTemplateReplace(template, libID, result));

                    path = `${util.getCurrentRoot()}/${output}/${aid}.xml`;
                    fs.writeFileSync(path, result);

                    Log.info(`Asset ${aid} saved as ${path}`);
                    res();
                } else {
                    rej('Empty response body');
                }

            } catch (err) {
                rej(err);
            }
        });
    }).catch(err => Log.error(err));
}

module.exports = downloadAsset;
