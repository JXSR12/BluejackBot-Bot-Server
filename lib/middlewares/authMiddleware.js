const { query } = require('../database');

exports.handle = async (handler, params, authKey) => {

    //To validate auth key, do the following:
    //Fetch from db in table 'issued_auth_keys' that has the 'key_value' the same with the authKey param above, but with 'key_expired_at' that is after the current timestamp.

    //Validate auth key is valid to db, if valid then execute the below:
    return await handler.handle(params);
};
