const validate = require('./validate.js');
const schema = {
    type: 'integer',
    minimum: 1,
    maximum: 12
};

module.exports = validate_expiry_month = (expiry_month) => {
    if (!validate(expiry_month, schema)) {
        throw new Error('Invalid Expiry Month');
    }
};