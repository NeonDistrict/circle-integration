const validate = require('./validate.js');
const schema = {
    type: 'string',
    minLength: 128,
    maxLength: 128,
    pattern:/^[a-f0-9]{128}$/i
};

module.exports = validate_sha512_hex = (sha512_hex) => {
    if (!validate(sha512_hex, schema)) {
        throw new Error('Invalid SHA 512 Hex');
    }
};