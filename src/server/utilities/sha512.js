const crypto = require('crypto');

module.exports = sha512 = (string_value) => {
    const hash = crypto.createHash('sha512');
    const hashed = hash.update(string_value.toString(), 'utf-8');
    const hex = hashed.digest('hex');
    return hex;
};