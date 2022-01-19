const { v4: uuidv4 } = require('uuid');
const call_circle = require('./call_circle.js');
const assess_payment_result = require('./assess_payment_result.js');
const api_uri_base = 'https://api-sandbox.circle.com/v1/';
// todo shoul dbe in config
const postgres = require('./postgres/postgres.js');

module.exports = create_payment = (internal_purchase_id, verification_type, card_id, encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, cb) => {
    const payment_3ds_idempotency_key = uuidv4();
    postgres.payment_3ds_start(internal_purchase_id, payment_3ds_idempotency_key, (error) => {
        if (error) {
            return cb(error);
        }
        const request_body = {
            idempotencyKey: payment_3ds_idempotency_key,
            keyId: encrypted_card_information.keyId,
            metadata: {
                email: email,
                phoneNumber: phone_number,
                sessionId: session_id,
                ipAddress: ip_address,
            },
            amount: {
                amount: sale_item.amount,
                currency: sale_item.currency
            },
            autoCapture: true,
            verification: verification_type,
            verificationSuccessUrl: config.three_d_secure_success_url,
            verificationFailureUrl: config.three_d_secure_failure_url,
            source: {
                id: card_id,
                type: 'card'
            },
            description: sale_item.statement_description,
            encryptedData: encrypted_card_information.encryptedMessage
        };
        call_circle([201], 'post', `${api_uri_base}payments`, request_body, (error, payment_result) => {
            if (error) {
                return cb(error);
            }
            assess_payment_result(internal_purchase_id, payment_result, (error, redirect, payment_id) => {
                if (error) {
                    return cb(error);
                }
                if (redirect) {
                    return cb(null, redirect);
                }
                return cb(null, payment_id);
            });
        });
    });
};