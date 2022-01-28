const is_valid = require('./is_valid.js');
const schema = {
    type: 'string',
    minLength: 8,
    maxLength: 20
};

module.exports = is_valid_card_number = (card_number) => {
    return is_valid(card_number, schema);
};