const is_valid = require('./is_valid.js');
const schema = {
    type: 'string',
    minLength: 128,
    maxLength: 128,
    pattern:/^[a-f0-9]{128}$/i
};

module.exports = is_valid_sha512_hex = (sha512_hex) => {
    return is_valid(sha512_hex, schema);
};