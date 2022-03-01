const { v4: uuidv4 } = require('uuid');
const log = require('../utilities/log.js');
const call_circle = require('../utilities/call_circle.js');
const assess_payment_result = require('./assess_payment_result.js');
const payment_unsecure_start = require('../postgres/payment_unsecure_start.js');
const payment_unsecure_mark_failed = require('../postgres/payment_unsecure_mark_failed.js');
const payment_unsecure_mark_fraud = require('../postgres/payment_unsecure_mark_fraud.js');
const payment_unsecure_mark_pending = require('../postgres/payment_unsecure_mark_pending.js');
const payment_unsecure_mark_completed = require('../postgres/payment_unsecure_mark_completed.js');

module.exports = async (internal_purchase_id, card_id, request_purchase, sale_item) => {
    const payment_unsecure_idempotency_key = uuidv4();
    log({
        event: 'create payment unsecure',
        internal_purchase_id: internal_purchase_id,
        card_id: card_id,
        request_purchase: request_purchase,
        sale_item: sale_item,
        payment_unsecure_idempotency_key: payment_unsecure_idempotency_key
    });
    await payment_unsecure_start(internal_purchase_id, payment_unsecure_idempotency_key);
    const circle_payment_request = {
        idempotencyKey: payment_unsecure_idempotency_key,
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
        verification: 'none',
        source: {
            id: card_id,
            type: 'card'
        },
        description: sale_item.statement_description,
        encryptedData: request_purchase.circle_encrypted_card_information
    };
    const payment_result = await call_circle(internal_purchase_id, [201], 'post', `/payments`, circle_payment_request);
    // note: there is no redirect or unavailable for unsecure, these nulls are intentional
    const mark_failed      = payment_unsecure_mark_failed;
    const mark_fraud       = payment_unsecure_mark_fraud;
    const mark_unavailable = null;
    const mark_redirected  = null;
    const mark_pending     = payment_unsecure_mark_pending;
    const mark_completed   = payment_unsecure_mark_completed;
    return await assess_payment_result(internal_purchase_id, request_purchase.user_id, payment_result, mark_failed, mark_fraud, mark_unavailable, mark_redirected, mark_pending, mark_completed);
};