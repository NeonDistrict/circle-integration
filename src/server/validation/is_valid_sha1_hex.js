const is_valid = require('./is_valid.js');
const schema = {
    type: 'string',
    minLength: 40,
    maxLength: 40,
    pattern:/^[a-f0-9]{40}$/i
};

module.exports = is_valid_sha1_hex = (sha1_hex) => {
    return is_valid(sha1_hex, schema);
};