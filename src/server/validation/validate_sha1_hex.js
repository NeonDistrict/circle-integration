const validate = require('./validate.js');
const schema = {
    type: 'string',
    minLength: 40,
    maxLength: 40,
    pattern:/^[a-f0-9]{40}$/i
};

module.exports = validate_sha1_hex = (sha1_hex) => {
    if (!validate(sha1_hex, schema)) {
        throw new Error('Invalid SHA 1 Hex');
    }
};