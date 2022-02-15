const validate = require('./validate.js');
const schema = {
    type: 'object',
    properties: {
        user_id: {
            type: 'string',
            minLength: 36,
            maxLength: 36,
            pattern: /[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}/i
        },
        client_generated_idempotency_key: {
            type: 'string',
            minLength: 36,
            maxLength: 36,
            pattern: /[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}/i
        },
        circle_public_key_id: {
            type: 'string',
            maxLength: 1024
        },
        circle_encrypted_card_information: {
            type: 'string',
            maxLength: 4096
        },
        integration_encrypted_card_information: {
            type: 'string',
            maxLength: 4096
        },
        name_on_card: {
            type: 'string',
            maxLength: 1024
        },
        city: {
            type: 'string',
            maxLength: 1024
        },
        country: {
            type: 'string',
            minLength: 2,
            maxLength: 2
        },
        address_line_1: {
            type: 'string',
            maxLength: 1024
        },
        address_line_2: {
            type: 'string',
            maxLength: 1024
        },
        district: {
            type: 'string',
            maxLength: 1024
        },
        postal_zip_code: {
            type: 'string',
            maxLength: 64
        },
        expiry_month: {
            type: 'integer',
            minimum: 1,
            maximum: 12
        },
        expiry_year: {
            type: 'integer',
            minimum: 1970,
            maximum: 9999
        },
        email: {
            type: 'string',
            maxLength: 1024,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        phone_number: {
            type: 'string',
            maxLength: 64
        },
        metadata_hash_session_id: {
            // todo document this is a sha1 hex
            type: 'string',
            minLength: 40,
            maxLength: 40,
            pattern:/^[a-f0-9]{40}$/i
        },
        ip_address: {
            type: 'string',
            maxLength: 1024,
            pattern: /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/
        },
        sale_item_key: {
            type: 'string',
            minLength: 3,
            maxLength: 128
        },
        success_url: {
            type: 'string',
            maxLength: 4096
        },
        failure_url: {
            type: 'string',
            maxLength: 4096
        }
    },
    required: [
        'user_id',
        'client_generated_idempotency_key',
        'circle_public_key_id',
        'circle_encrypted_card_information',
        'integration_encrypted_card_information',
        'name_on_card',
        'city',
        'country',
        'address_line_1',
        'address_line_2',
        'district',
        'postal_zip_code',
        'expiry_month',
        'expiry_year',
        'email',
        'phone_number',
        'metadata_hash_session_id',
        'ip_address',
        'sale_item_key',
        'success_url',
        'failure_url'
    ],
    additionalProperties: false
};

module.exports = validate_request_purchase = (request_purchase) => {
    validate(request_purchase, schema);
    return;
};