const fs = require('fs');
const path = require('path');
const {DOMParser} = require('xmldom');
const x = require('xpath');
const prettifier = require('prettify-xml');
const utils = require('./util');
const Constants = require('./constants');
const Log = require('./logger');

function absolutePath(config, fpath) {
  let source = '';

  if (path.isAbsolute(fpath)) {
    source = fpath;
  } else if (config.basePath) {
      source = path.join(config.basePath, Constants.SITES_META_FOLDER, fpath);
    } else {
      source = path.join(utils.getCurrentRoot(), fpath);
    }

  return source;
}

exports.splitBundle = function (config, fpath, xpath, out, cfg) {
  const template = fs.readFileSync(`${__dirname}/${Constants.RESOURCES_FOLDER}/${cfg.template}.template`).toString();
  const filepath = absolutePath(config, fpath);
  const xmlFile = fs.readFileSync(filepath).toString();

  if (!xmlFile) {
    console.error(`Error while reading file at ${filepath}`);
    return;
  }

  return new Promise((resolve, reject) => {
    const document = new DOMParser().parseFromString(xmlFile.replace(`xmlns="${cfg.ns}"`, ''));
    const nodes = x.select(xpath, document);
    const nodeMap = nodes.map(node => new Promise((fileResolve, fileReject) => cfg.persist(
      node,
      fileResolve,
      fileReject,
      out || path.dirname(filepath),
      template
    )
    ));

    Promise.all(nodeMap)
      .then(results => {
        resolve(results);
      })
      .catch(reject);
  }).catch(err => Log.error(err));
}

exports.split = function (config, path, out) {
  let child = 1; // start from 1 to skip <xml/>
  let xmlFile;
  let document;
  let node;
  let nodeName;

  path = absolutePath(config, path);
  if (!fs.existsSync(path)) return;

  xmlFile = fs.readFileSync(path).toString().replace(/xmlns=".+?"/, '');
  document = new DOMParser().parseFromString(xmlFile);

  while (document.childNodes[child].nodeName === '#text') {
    child++;
  }

  node = document.childNodes[child];
  nodeName = node.nodeName;

  if (!exports.processors[nodeName]) {
    throw new Error(`Splitting ${  nodeName  } is currently not supported.`);
  } else {
    return exports.processors[nodeName](config, path, out, prettifier)
  }
}

exports.processors = {
  library (config, fpath, out, prettifier) {
    return exports.splitBundle(config, fpath, '//content', out, {
      template: 'library',
      ns: 'http://www.demandware.com/xml/impex/library/2006-10-31',
      persist: (node, resolve, reject, out, template) => {
        const library = node.parentNode;

        fs.writeFile(`${out  }/library.${  node.getAttribute('content-id')  }.xml`, prettifier(template.replace('{{ libraryid }}', library.hasAttribute('library-id') ? library.getAttribute('library-id') : '').replace('{{ objects }}', (function (replacement) {
          return () => replacement;
        })(node.toString())), {
          indent: config.indentSize
        }), (err) => {
          err ? reject(err) : resolve()
        });
      }
    });
  },
  'slot-configurations' (config, fpath, out, prettifier) {
    return exports.splitBundle(config, fpath, '//slot-configuration', out, {
      template: 'slots',
      ns: 'http://www.demandware.com/xml/impex/slot/2008-09-08',
      persist: (node, resolve, reject, out, template) => {
        const slot = node.parentNode;

        fs.writeFile(`${out  }/slots.${  node.getAttribute('slot-id')  }.xml`, prettifier(template.replace('{{ objects }}', (function (replacement) {
          return () => replacement;
        })(node.toString())), {
          indent: config.indentSize
        }), (err) => {
          err ? reject(err) : resolve()
        });
      }
    });
  },
  metadata (config, fpath, out, prettifier) {
    function cloneAttribute(cloneInstance, source, attribute) {
      const id = attribute.getAttribute('attribute-id');
      let attrType;

      switch (cloneInstance.nodeName) {
        case 'custom-type':
          attrType = '';
          break;

        case 'type-extension':
          attrType = `${attribute.getAttribute('system') === 'true' ? 'system' : 'custom'  }-`;
          break;
      }

      Array.from(source.getElementsByTagName(`${attrType  }attribute-definitions`)[0].childNodes)
        .filter(ad => ad.nodeName === 'attribute-definition' && ad.getAttribute('attribute-id') === id)
        .forEach(ad => {
          cloneInstance.getElementsByTagName(`${attrType  }attribute-definitions`)[0]
            .appendChild(ad.cloneNode(true));
        });
    }
    return exports.splitBundle(config, fpath, '/metadata/*', out, {
      template: 'metadata',
      ns: 'http://www.demandware.com/xml/impex/metadata/2006-10-31',
      persist: (node, resolve, reject, out, template) => {
        switch (node.nodeName) {
          case 'custom-type':
          case 'type-extension':
            break;

          default:
            return;
        }

        const clone = node.cloneNode();

        Array.from(node.childNodes)
        .filter(child => child.hasOwnProperty('nodeName'))
        .forEach(child => {
          let childClone;

          switch (child.nodeName) {
            case 'system-attribute-definitions':
            case 'custom-attribute-definitions':
            case 'attribute-definitions':
            case 'group-definitions':
              childClone = child.cloneNode();
              break;

            default:
              childClone = child.cloneNode(true);
          }

          clone.appendChild(childClone);
        });

        // IMPORTANT: DO NOT modify "clone" and "node" variables within the promises !!!

        Promise.all(Array.from((node.getElementsByTagName('group-definitions')[0] || {
            childNodes: []
          }).childNodes).filter(group => group.nodeName === 'attribute-group')
          .map(group => new Promise((r1, e1) => {

            const cloneInstance = clone.cloneNode(true);

            // no need to check if group-definitions exists because if
            // code has reached this point it means it does.
            cloneInstance.getElementsByTagName('group-definitions')[0].appendChild(group.cloneNode(true));

            Array.from(group.childNodes)
              .filter(attribute => attribute.nodeName === 'attribute')
              .map(attribute => {
                cloneAttribute(cloneInstance, node, attribute);
              });

            /**
             * if there are no extracted attributes then remove the entire
             * definitions node because dw complains when its empty
             */
            Array.from(cloneInstance.childNodes).forEach(node => {
              if (!node.nodeName) return;

              switch (node.nodeName) {
                case 'custom-attribute-definitions':
                case 'system-attribute-definitions':
                  if (!Object.keys(node.childNodes).length) {
                    cloneInstance.removeChild(node);
                  }
                  break;
              }
            });

            const nodeType = cloneInstance.nodeName === 'custom-type' ? 'custom' : 'system'
            const attributeType = cloneInstance.getAttribute('type-id');
            const projectID = config.projectID || 'projectID';
            const groupID = group.getAttribute('group-id').replace(' ', '');
            const writePath = `${out}/${nodeType}.${attributeType}.${projectID}.${groupID}.xml`;

            fs.writeFile(
              writePath,
              prettifier(template.replace('{{ objects }}', cloneInstance.toString()), {
                indent: config.indentSize
              }),
              (err) => {
                err ? e1(err) : r1('done');
              }
            );
          }))).then(resolve).catch(reject);
      }
    });
  },
  promotions (config, path, out, prettifier) {
    const nodes = {
      campaign: {},
      promotion: {},
      assign: {}
    };

    let template;

    return exports.splitBundle(config, path, '/promotions/*', out, {
      template: 'promotions',
      ns: 'http://www.demandware.com/xml/impex/promotion/2008-01-31',
      persist: (node, resolve, reject, _out, _templ) => {
        template = _templ;
        out = _out;

        if (node.nodeName === 'promotion-campaign-assignment') {
          const id = node.getAttribute('campaign-id');
          if (!nodes.assign[id]) {
            nodes.assign[id] = [];
          }

          nodes.assign[id].push(node);
        } else {
          nodes[node.nodeName][node.getAttribute(`${node.nodeName  }-id`)] = node;
        }

        resolve();
      }
    }).then(() => {

      return Promise.all(Object.keys(nodes.campaign).map(id => {
        let objects = nodes.campaign[id].toString();
        let assignments = '';

        (nodes.assign[id] || []).map(assignment => {
          objects += nodes.promotion[assignment.getAttribute('promotion-id')].toString();

          assignments += assignment.toString();
        })

        objects += assignments;

        return new Promise((resolve, reject) => {
          fs.writeFile(`${out  }/campaign.${  id  }.xml`, prettifier(template.replace('{{ objects }}', objects)), {
            indent: config.indentSize
          }, (err) => {
            err ? reject(err) : resolve('done');
          });
        }).catch(err => Log.error(err));
      }));
    });
  }
}
