const { v4: uuidv4 } = require('uuid');
const call_circle = require('./call_circle.js');
const assess_payment_result = require('./assess_payment_result.js');
const purchase_log = require('./purchase_log.js');
const payment_unsecure_start = require('./postgres/payment_unsecure_start.js');
const payment_unsecure_mark_failed = require('./postgres/payment_unsecure_mark_failed.js');
const payment_unsecure_mark_fraud = require('./postgres/payment_unsecure_mark_fraud.js');
const payment_unsecure_mark_pending = require('./postgres/payment_unsecure_mark_pending.js');
const payment_unsecure_mark_completed = require('./postgres/payment_unsecure_mark_completed.js');

module.exports = create_payment_unsecure = async (internal_purchase_id, user_id, card_id, circle_public_key_id, encrypted_card_information, email, phone_number, metadata_hash_session_id, ip_address, sale_item) => {
    purchase_log(internal_purchase_id, {
        event: 'create_payment_unsecure'
    });
    const payment_unsecure_idempotency_key = uuidv4();
    await payment_unsecure_start(internal_purchase_id, payment_unsecure_idempotency_key);
    const request_body = {
        idempotencyKey: payment_unsecure_idempotency_key,
        keyId: circle_public_key_id,
        metadata: {
            email: email,
            phoneNumber: phone_number,
            sessionId: metadata_hash_session_id,
            ipAddress: ip_address,
        },
        amount: {
            amount: sale_item.sale_item_price,
            currency: sale_item.currency
        },
        autoCapture: true,
        verification: 'none',
        source: {
            id: card_id,
            type: 'card'
        },
        description: sale_item.statement_description,
        encryptedData: encrypted_card_information
    };
    const payment_result = await call_circle([201], 'post', `${config.api_uri_base}payments`, request_body);
    // note: there is no redirect or unavailable for unsecure, these nulls are intentional
    const mark_failed      = payment_unsecure_mark_failed;
    const mark_fraud       = payment_unsecure_mark_fraud;
    const mark_unavailable = null;
    const mark_redirected  = null;
    const mark_pending     = payment_unsecure_mark_pending;
    const mark_completed   = payment_unsecure_mark_completed;
    return await assess_payment_result(internal_purchase_id, user_id, payment_result, mark_failed, mark_fraud, mark_unavailable, mark_redirected, mark_pending, mark_completed);
};