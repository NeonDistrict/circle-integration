const validate_string = require('./validate_string.js');

module.exports = validate_circle_encrypted_card_information = (circle_encrypted_card_information) => {
    if (!validate_string(circle_encrypted_card_information))
    {
        throw new Error('Invalid circle_encrypted_card_information');
    }
};