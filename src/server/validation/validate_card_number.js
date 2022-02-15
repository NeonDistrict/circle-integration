const validate = require('./validate.js');
const schema = {
    type: 'string',
    minLength: 8,
    maxLength: 20
};

module.exports = validate_card_number = (card_number) => {
    validate(card_number, schema);
};