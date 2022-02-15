const { v4: uuidv4 } = require('uuid');
const call_circle = require('./call_circle.js');
const assess_payment_result = require('./assess_payment_result.js');
const purchase_log = require('./purchase_log.js');
const payment_3ds_start = require('./postgres/payment_3ds_start.js');
const payment_3ds_mark_failed = require('./postgres/payment_3ds_mark_failed.js');
const payment_3ds_mark_fraud = require('./postgres/payment_3ds_mark_fraud.js');
const payment_3ds_mark_unavailable = require('./postgres/payment_3ds_mark_unavailable.js');
const payment_3ds_mark_redirected = require('./postgres/payment_3ds_mark_redirected.js');
const payment_3ds_mark_pending = require('./postgres/payment_3ds_mark_pending.js');
const payment_3ds_mark_completed = require('./postgres/payment_3ds_mark_completed.js');

module.exports = create_payment_3ds = async (internal_purchase_id, card_id, request_purchase, sale_item) => {
    purchase_log(internal_purchase_id, {
        event: 'create_payment_3ds',
        details: {
            internal_purchase_id: internal_purchase_id, 
            card_id: card_id, 
            request_purchase: request_purchase,
            sale_item: sale_item
        }
    });
    const payment_3ds_idempotency_key = uuidv4();
    await payment_3ds_start(internal_purchase_id, payment_3ds_idempotency_key);
    const circle_payment_request = {
        idempotencyKey: payment_3ds_idempotency_key,
        keyId: request_purchase.circle_public_key_id,
        metadata: {
            email: request_purchase.email,
            phoneNumber: request_purchase.phone_number,
            sessionId: request_purchase.metadata_hash_session_id,
            ipAddress: request_purchase.ip_address,
        },
        amount: {
            amount: sale_item.sale_item_price,
            currency: sale_item.currency
        },
        autoCapture: true,
        verification: 'three_d_secure',
        verificationSuccessUrl: request_purchase.success_url,
        verificationFailureUrl: request_purchase.failure_url,
        source: {
            id: card_id,
            type: 'card'
        },
        description: sale_item.statement_description,
        encryptedData: request_purchase.circle_encrypted_card_information
    };
    const payment_result = await call_circle([201], 'post', `/payments`, circle_payment_request);
    const mark_failed      = payment_3ds_mark_failed;
    const mark_fraud       = payment_3ds_mark_fraud;
    const mark_unavailable = payment_3ds_mark_unavailable;
    const mark_redirected  = payment_3ds_mark_redirected;
    const mark_pending     = payment_3ds_mark_pending;
    const mark_completed   = payment_3ds_mark_completed;
    return await assess_payment_result(internal_purchase_id, request_purchase.user_id, payment_result, mark_failed, mark_fraud, mark_unavailable, mark_redirected, mark_pending, mark_completed);
};