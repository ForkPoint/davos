module.exports = {
    "ecmaVersion": 6,
    "ecmaFeatures": {
        "modules": true,
        "module":  true
    },
    "env": {
        "mocha": true,
        "node":  true,
        "es6":   true
    },
    "plugins": [
        "babel",
        "import",
        "mocha"
    ],
    "extends": "eslint:recommended",
    "rules": {
      "indent": ["error", 2],
      "linebreak-style": ["error", "unix"]
    }
};
