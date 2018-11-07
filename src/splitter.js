const fs = require("fs");
const path = require("path");
const log = require('./logger');
const DOMParser = require('xmldom').DOMParser;
const x = require("xpath");
const xdom = require("xmldom");
const prettifier = require('prettify-xml');

function absolutePath(davos, fpath) {
  let source;
  if(path.isAbsolute(fpath)) {
    source = fpath;
  } else {
    if(davos.config.basePath) {
      source = path.join(davos.config.basePath, davos.SITES_META_FOLDER, fpath);
    } else {
      source = path.join( process.cwd(), fpath );
    }

  }
  return source;
}

exports.splitBundle = function (davos, fpath, xpath, out, cfg) {
  const template = fs.readFileSync(__dirname + "/../resources/" + cfg.template + ".template").toString();
  const filepath = absolutePath(davos, fpath);

  return new Promise((r, e) => {
    fs.readFile(filepath, (err, xml) => {
      if (err) {
        return e(err);
      }

      out = out || path.dirname(filepath);

      let document = new xdom.DOMParser().parseFromString(xml.toString().replace('xmlns="' + cfg.ns + '"', ''));
      let nodes = x.select(xpath, document);

      Promise.all(nodes.map(node => new Promise((fp, fe) => cfg.persist(node, fp, fe, out, template)))).then(results => {
        r(results);
      }).catch(e);
    });
  });
}

exports.split = function (davos, path, out) {
  path = absolutePath(davos, path);

  if (!fs.existsSync(path)) {
    return;
  }


  let child = 1; // start from 1 to skip <xml/>
  let document = new DOMParser().parseFromString(fs.readFileSync(path).toString().replace(/xmlns=".+?"/, ''));

  while (document.childNodes[child].nodeName === "#text") {
    child++;
  }

  let node = document.childNodes[child],
    nodeName = node.nodeName;

  if (!exports.processors[nodeName]) {
    throw new Error("Splitting " + nodeName + " is currently not supported.");
  } else {
    return exports.processors[nodeName](davos, path, out, prettifier)
  }
}

exports.processors = {
  library: function (davos, fpath, out, prettifier) {
    return exports.splitBundle(davos, fpath, "//content", out, {
      template: "library",
      ns: "http://www.demandware.com/xml/impex/library/2006-10-31",
      persist: (node, resolve, reject, out, template) => {
        let library = node.parentNode;

        fs.writeFile(out + "/library." + node.getAttribute("content-id") + ".xml", prettifier(template.replace("{{ libraryid }}", library.hasAttribute("library-id") ? library.getAttribute("library-id") : "").replace("{{ objects }}", (function (replacement) {
          return () => replacement;
        })(node.toString())), {
          indent: davos.config.indentSize
        }), function (err) {
          err ? reject(err) : resolve()
        });
      }
    });
  },
  'slot-configurations': function (davos, fpath, out, prettifier) {
    return exports.splitBundle(davos, fpath, "//slot-configuration", out, {
      template: "slots",
      ns: "http://www.demandware.com/xml/impex/slot/2008-09-08",
      persist: (node, resolve, reject, out, template) => {
        let slot = node.parentNode;

        fs.writeFile(out + "/slots." + node.getAttribute("slot-id") + ".xml", prettifier(template.replace("{{ objects }}", (function (replacement) {
          return () => replacement;
        })(node.toString())), {
          indent: davos.config.indentSize
        }), function (err) {
          err ? reject(err) : resolve()
        });
      }
    });
  },
  metadata: function (davos, fpath, out, prettifier) {
    function cloneAttribute(cloneInstance, source, attribute) {
      let id = attribute.getAttribute("attribute-id");
      let attrType;

      switch (cloneInstance.nodeName) {
        case "custom-type":
          attrType = "";
          break;

        case "type-extension":
          attrType = (attribute.getAttribute("system") === "true" ? "system" : "custom") + "-";
          break;
      }

      Array.from(source.getElementsByTagName(attrType + "attribute-definitions")[0].childNodes)
        .filter(ad => ad.nodeName === "attribute-definition" && ad.getAttribute("attribute-id") === id)
        .forEach(ad => {
          cloneInstance.getElementsByTagName(attrType + "attribute-definitions")[0]
            .appendChild(ad.cloneNode(true));
        });
    }

    return exports.splitBundle(davos, fpath, "/metadata/*", out, {
      template: "metadata",
      ns: "http://www.demandware.com/xml/impex/metadata/2006-10-31",
      persist: (node, resolve, reject, out, template) => {
        switch (node.nodeName) {
          case "custom-type":
          case "type-extension":
            break;

          default:
            return;
        }

        let clone = node.cloneNode();

        if (node.nodeName === "type-extension" && node.getAttribute("type-id") === "Basket") {
          var greeting = 'Wazaaaaa';
        }

        Array.from(node.childNodes)
        .filter(child => child.hasOwnProperty("nodeName"))
        .forEach(child => {
          let childClone;

          switch (child.nodeName) {
            case "system-attribute-definitions":
            case "custom-attribute-definitions":
            case "attribute-definitions":
            case "group-definitions":
              childClone = child.cloneNode();
              break;

            default:
              childClone = child.cloneNode(true);
          }

          clone.appendChild(childClone);
        });

        // IMPORTANT: DO NOT modify "clone" and "node" variables within the promises !!!

        Promise.all(Array.from((node.getElementsByTagName("group-definitions")[0] || {
            childNodes: []
          }).childNodes).filter(group => group.nodeName === "attribute-group")
          .map(group => new Promise((r1, e1) => {

            let cloneInstance = clone.cloneNode(true);

            // no need to check if group-definitions exists because if
            // code has reached this point it means it does.
            cloneInstance.getElementsByTagName("group-definitions")[0].appendChild(group.cloneNode(true));

            Array.from(group.childNodes)
              .filter(attribute => attribute.nodeName === "attribute")
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
                case "custom-attribute-definitions":
                case "system-attribute-definitions":
                  if (!Object.keys(node.childNodes).length) {
                    cloneInstance.removeChild(node);
                  }
                  break;
              }
            });

            fs.writeFile(
              out + "/" + (cloneInstance.nodeName === "custom-type" ? "custom" : "system") + "." + cloneInstance.getAttribute("type-id") + "." + (davos.config.projectID || "projectID") + "." + group.getAttribute("group-id").replace(' ', '') + ".xml",
              prettifier(template.replace("{{ objects }}", cloneInstance.toString()), {
                indent: davos.config.indentSize
              }),
              function (err) {
                err ? e1(err) : r1("done");
              }
            );
          }))).then(resolve).catch(reject);
      }
    });
  },
  promotions: function (davos, path, out, prettifier) {
    let nodes = {
      campaign: {},
      promotion: {},
      assign: {}
    };

    let template;

    return exports.splitBundle(davos, path, "/promotions/*", out, {
      template: "promotions",
      ns: "http://www.demandware.com/xml/impex/promotion/2008-01-31",
      persist: (node, resolve, reject, _out, _templ) => {
        template = _templ;
        out = _out;

        if (node.nodeName === "promotion-campaign-assignment") {
          let id = node.getAttribute("campaign-id");
          if (!nodes.assign[id]) {
            nodes.assign[id] = [];
          }

          nodes.assign[id].push(node);
        } else {
          nodes[node.nodeName][node.getAttribute(node.nodeName + "-id")] = node;
        }

        resolve();
      }
    }).then(() => {

      return Promise.all(Object.keys(nodes.campaign).map(id => {
        let objects = nodes.campaign[id].toString();
        let assignments = "";

        (nodes.assign[id] || []).map(assignment => {
          objects += nodes.promotion[assignment.getAttribute("promotion-id")].toString();

          assignments += assignment.toString();
        })

        objects += assignments;

        return new Promise((resolve, reject) => {
          fs.writeFile(out + "/campaign." + id + ".xml", prettifier(template.replace("{{ objects }}", objects)), {
            indent: davos.config.indentSize
          }, function (err) {
            err ? reject(err) : resolve("done");
          });
        })
      }))
    });
  }
}
