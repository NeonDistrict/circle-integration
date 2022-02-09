const validate = require('./validate.js');
const schema = {
    type: 'string',
    minLength: 4,
    maxLength: 16,
    pattern: /^[0-9]{1,13}\.[0-9]{2}$/
};

module.exports = validate_sale_item_price = (uuid) => {
    if (!validate(uuid, schema)) {
        throw new Error('Invalid Sale Item Price');
    }
};