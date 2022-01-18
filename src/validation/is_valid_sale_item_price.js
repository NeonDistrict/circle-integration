const is_valid = require('./is_valid.js');
const schema = {
    type: 'string',
    minLength: 4,
    maxLength: 16,
    pattern: /^[0-9]{1,13}\.[0-9]{2}$/
};

module.exports = is_valid_sale_item_price = (uuid) => {
    return is_valid(uuid, schema);
};