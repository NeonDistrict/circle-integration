const is_valid = require('./is_valid.js');
const schema = {
    type: 'string',
    minLength: 3,
    maxLength: 128
};

module.exports = is_valid_sale_item_key = (uuid) => {
    return is_valid(uuid, schema);
};