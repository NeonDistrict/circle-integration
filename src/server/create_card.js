const { v4: uuidv4 } = require('uuid');
const call_circle = require('./call_circle.js');
const assess_create_card_result = require('./assess_create_card_result.js');

module.exports = create_card = (config, postgres, internal_purchase_id, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, session_id, ip_address, cb) => {
    const create_card_idempotency_key = uuidv4();

    postgres.create_card_start(internal_purchase_id, create_card_idempotency_key, (error) => {
        if (error) {
            return cb(error);
        }
        const request_body = {
            idempotencyKey: create_card_idempotency_key,
            keyId: encrypted_card_information.keyId,
            encryptedData: encrypted_card_information.encryptedMessage,
            billingDetails: {
                name: name_on_card,
                city: city,
                country: country,
                line1: address_line_1,
                line2: address_line_2,
                district: district,
                postalCode: postal_zip_code
            },
            expMonth: expiry_month,
            expYear: expiry_year,
            metadata: {
                email: email,
                phoneNumber: phone_number,
                sessionId: session_id,
                ipAddress: ip_address
            }
        };
        call_circle(config, [201], 'post', `${config.api_uri_base}cards`, request_body, (error, create_card_result) => {
            if (error) {
                return cb(error);
            }
            assess_create_card_result(postgres, internal_purchase_id, create_card_result, (error, card_id) => {
                if (error) {
                    return cb(error);
                }
                return cb(null, card_id);
            });
        });
    });
};