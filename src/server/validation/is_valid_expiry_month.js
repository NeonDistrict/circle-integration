const is_valid = require('./is_valid.js');
const schema = {
    type: 'integer',
    minimum: 1,
    maximum: 12
};

module.exports = is_valid_expiry_month = (expiry_month) => {
    return is_valid(expiry_month, schema);
};