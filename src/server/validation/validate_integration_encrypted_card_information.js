const validate_string = require('./validate_string.js');

module.exports = validate_integration_encrypted_card_information = (integration_encrypted_card_information) => {
    if (!validate_string(integration_encrypted_card_information))
    {
        throw new Error('Invalid integration_encrypted_card_information');
    }
};