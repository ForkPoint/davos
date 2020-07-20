const xmlm = require('xmlappend');
const fs = require('fs');
const splitter = require('./splitter');

function escapeReplacement(string) {
  return string.replace(/\$/g, '$$$');
}

function htmlEntities(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

exports.merge = function (config, files) {
  if (!Array.isArray(files) || !files[0]) {
    return;
  }

  const xdom = require('xmldom');
  const parser = new xdom.DOMParser();

  let child = 1; // start from 1 to skip <xml/>
  const readFile = fs.readFileSync(files[0]);
  const document = parser.parseFromString(readFile.toString().replace(/xmlns=".+?"/, ''));

  while (document.childNodes[child].nodeName === '#text') {
    child++;
  }

  const node = document.childNodes[child],
    {nodeName} = node;
  return exports.processors[exports.processors[nodeName] ? nodeName : 'generic'](config, files, node);
}

exports.processors = {
  generic (config, files, rootElement) {
    return Promise.resolve(xmlm(...files.map(file => fs.readFileSync(file).toString()).filter(content => !!content)));
  },
  services (config, files, rootElement) {
    let template = null;

    return Promise.all(files.map(filename => {
      return splitter.splitBundle(config, filename, '/services/*', null, {
        template: 'services',
        ns: 'http://www.demandware.com/xml/impex/services/2014-09-26',
        persist: (node, resolve, reject, out, xmltemplate) => {
          if (node) {
            template = xmltemplate;
            resolve(node);
          }
        }
      });
    })).then(nodes => {
      nodes = [].concat.apply([], nodes); // flatten array of arrays
      const weights = ['service-credential', 'service-profile', 'service'];

      return Promise.resolve(template.replace('{{ objects }}', nodes.sort((a, b) => {
        return weights.indexOf(a.nodeName) - weights.indexOf(b.nodeName);
      }).map(node => node.toString()).join('')));
    });
  },
  library (config, files, rootElement) {
    const contents = [];
    function containsEncodedHTML(node) {
      return node.nodeName === '#text' && node.nodeValue.match(/(<([^>]+)>)/i)
    }
    function extractContent(node) {
      contents.push(htmlEntities(escapeReplacement(node.nodeValue)));
      node.nodeValue = `{{ htmlcontent${contents.length - 1} }}`;
      node.data = node.nodeValue;
    }
    function extractContents(node) {
      if (containsEncodedHTML(node)) {
        extractContent(node);
      } else if (node.childNodes && Object.keys(node.childNodes).length) {
        Array.from(node.childNodes).forEach(child => {
          if (containsEncodedHTML(child)) {
            extractContent(child);
          } else {
            extractContents(child);
          }
        });
      }
    }

    let template = null;

    return Promise.all(files.map(filename => {
      return splitter.splitBundle(config, filename, '/library/*', null, {
        template: 'library',
        ns: 'http://www.demandware.com/xml/impex/library/2006-10-31',
        persist: (node, resolve, reject, out, xmltemplate) => {
          template = xmltemplate;
          resolve(node);
        }
      });
    })).then(nodes => {
      nodes = [].concat.apply([], nodes); // flatten array of arrays

      // put folder nodes first in the list
      const weights = ['folder', 'content'];
      nodes = nodes.sort((a, b) => {
        return weights.indexOf(a.nodeName) - weights.indexOf(b.nodeName);
      });

      nodes.forEach(extractContents); // extract html content from text nodes recursively

      // replace library id and nodes in template
      let result = template.replace('{{ libraryid }}', rootElement.getAttribute('library-id'))
        .replace('{{ objects }}', nodes.map(node => escapeReplacement(node.toString())).join(''))

      // replace extracted contents
      result = contents.reduce((xml, content, index) => {
        return xml.replace(`{{ htmlcontent${index} }}`, content);
      }, result);

      return Promise.resolve(result);
    });
  },
  promotions (config, files, rootElement) {
    let template = null;

    return Promise.all(files.map(filename => {
      return splitter.splitBundle(config, filename, '/promotions/*', null, {
        template: 'promotions',
        ns: 'http://www.demandware.com/xml/impex/promotion/2008-01-31',
        persist: (node, resolve, reject, out, xmltemplate) => {
          if (node) {
            template = xmltemplate;
            resolve(node);
          }
        }
      });
    })).then(nodes => {
      const weights = ['campaign', 'promotion', 'promotion-campaign-assignment'];

      nodes = [].concat.apply([], nodes); // flatten array of arrays

      return Promise.resolve(template.replace('{{ objects }}', nodes.sort((a, b) => {
        return weights.indexOf(a.nodeName) - weights.indexOf(b.nodeName);
      }).map(node => node.toString()).join('')));
    });
  },
}
