const validate = require('./validate.js');
const schema = {
    type: 'integer',
    minimum: 1970,
    maximum: 9999
};

module.exports = validate_expiry_year = (expiry_year) => {
    if (!validate(expiry_year, schema)) {
        throw new Error('Invalid Expiry Year');
    }
};