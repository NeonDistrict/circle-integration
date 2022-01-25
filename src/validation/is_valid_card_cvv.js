const is_valid = require('./is_valid.js');
const schema = {
    type: 'string',
    minLength: 3,
    maxLength: 4
};

module.exports = is_valid_card_cvv = (card_cvv) => {
    return is_valid(card_cvv, schema);
};