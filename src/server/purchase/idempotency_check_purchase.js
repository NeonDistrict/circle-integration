const log = require('../utilities/log.js');
const find_purchase_by_client_generated_idempotency_key = require('../postgres/find_purchase_by_client_generated_idempotency_key.js');
const is_purchase_idempotent_equal = require('../utilities/is_purchase_idempotent_equal.js');
const user_mark_fraud = require('../postgres/user_mark_fraud.js');
const resolve_purchase = require('./resolve_purchase.js');

module.exports = async (request_purchase, metadata) => {
    log({
        event: 'idempotency check purchase',
        request_purchase: request_purchase,
        metadata: metadata
    });
    const existing_purchase = await find_purchase_by_client_generated_idempotency_key(request_purchase.client_generated_idempotency_key);
    if (existing_purchase === null) {
        return null;
    }
    if (!is_purchase_idempotent_equal(existing_purchase, request_purchase, metadata)) {
        await user_mark_fraud(request_purchase.user_id);
        log({
            event: 'idempotency check encountered a collision',
            request_purchase: request_purchase,
            metadata: metadata,
            existing_purchase: existing_purchase
        });
        throw new Error('Idempotency Collision');
    }
    const assessment = await resolve_purchase(existing_purchase);
    if (assessment.hasOwnProperty('error')) {
        throw new Error(assessment.error);
    }
    if (!assessment) {
        log({
            event: 'idempotency check resolve purchase did not return an assessment',
            request_purchase: request_purchase,
            metadata: metadata,
            existing_purchase: existing_purchase
        }, true);
        throw new Error('Internal Server Error');
    }
    return assessment;
};