const is_valid = require('./is_valid.js');
const schema = {
    type: 'integer',
    minimum: 1970,
    maximum: 9999
};

module.exports = is_valid_expiry_year = (expiry_year) => {
    return is_valid(expiry_year, schema);
};