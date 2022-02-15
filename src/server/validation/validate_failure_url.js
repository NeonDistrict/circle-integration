const validate_string = require('./validate_string.js');

module.exports = validate_failure_url = (failure_url) => {
    if (!validate_string(failure_url))
    {
        throw new Error('Invalid failure_url');
    }
};