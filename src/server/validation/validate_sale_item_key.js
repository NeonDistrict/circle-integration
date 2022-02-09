const validate = require('./validate.js');
const schema = {
    type: 'string',
    minLength: 3,
    maxLength: 128
};

module.exports = validate_sale_item_key = (uuid) => {
    if (!validate(uuid, schema)) {
        throw new Error('Invalid Sale Item Key');
    }
};