const { v4: uuidv4 } = require('uuid');
const call_circle = require('./call_circle.js');
const assess_payment_result = require('./assess_payment_result.js');
const purchase_log = require('./purchase_log.js');

module.exports = create_payment_cvv = (config, postgres, internal_purchase_id, user_id, card_id, circle_public_key_id, encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, cb) => {
    purchase_log(internal_purchase_id, {
        event: 'create_payment_cvv'
    });
    
    const payment_cvv_idempotency_key = uuidv4();
    postgres.payment_cvv_start(internal_purchase_id, payment_cvv_idempotency_key, (error) => {
        if (error) {
            return cb(error);
        }
        const request_body = {
            idempotencyKey: payment_cvv_idempotency_key,
            keyId: circle_public_key_id,
            metadata: {
                email: email,
                phoneNumber: phone_number,
                sessionId: session_id,
                ipAddress: ip_address,
            },
            amount: {
                amount: sale_item.sale_item_price,
                currency: sale_item.currency
            },
            autoCapture: true,
            verification: 'cvv',
            source: {
                id: card_id,
                type: 'card'
            },
            description: sale_item.statement_description,
            encryptedData: encrypted_card_information
        };
        call_circle(config, [201], 'post', `${config.api_uri_base}payments`, request_body, (error, payment_result) => {
            if (error) {
                return cb(error);
            }
            // note: there is no redirect for cvv, this null is intentional
            const mark_failed      = postgres.payment_cvv_mark_failed;
            const mark_fraud       = postgres.payment_cvv_mark_fraud;
            const mark_unavailable = postgres.payment_cvv_mark_unavailable;
            const mark_redirected  = null;
            const mark_pending     = postgres.payment_cvv_mark_pending;
            const mark_completed   = postgres.payment_cvv_mark_completed;
            assess_payment_result(config, postgres, internal_purchase_id, user_id, payment_result, mark_failed, mark_fraud, mark_unavailable, mark_redirected, mark_pending, mark_completed, cb);
        });
    });
};