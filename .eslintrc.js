module.exports = {
    "extends": "defaults",
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
    ]
};
