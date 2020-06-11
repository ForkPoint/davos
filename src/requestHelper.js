const Constants = require('./constants');
const request = require('request');

async function getAccessToken(clientID, clientSecret) {
    const options = {
        uri: `https://${Constants.ACCOUNT_MANAGER_HOST}/${Constants.ACCOUNT_MANAGER_TOKEN_PATH}`,
        method: 'POST',
        auth: {
            user: clientID,
            password: encodeURIComponent(clientSecret)
        },
        json: true,
        form: { grant_type: 'client_credentials' }
    };

    return new Promise((res, rej) => {
        request.post(options, (err, response) => {
            if (!err) {
                res(response.body.access_token);
            } else {
                Log.error(err);
                rej(err);
            }
        });
    });
}

module.exports = {
    getAccessToken: getAccessToken
};
