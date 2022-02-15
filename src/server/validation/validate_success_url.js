const validate_string = require('./validate_string.js');

module.exports = validate_success_url = (success_url) => {
    if (!validate_string(success_url))
    {
        throw new Error('Invalid success_url');
    }
};