const find_purchase_by_client_generated_idempotency_key = require('./postgres/find_purchase_by_client_generated_idempotency_key.js');
const is_purchase_idempotent_equal = require('./utilities/is_purchase_idempotent_equal.js');
const user_mark_fraud = require('./postgres/user_mark_fraud.js');
const resolve_purchase = require('./resolve_purchase.js');

module.exports = idempotency_check_purchase = async (request_purchase, metadata) => {
    const existing_purchase = await find_purchase_by_client_generated_idempotency_key(request_purchase.client_generated_idempotency_key);
    if (existing_purchase === null) {
        return null;
    }
    if (!is_purchase_idempotent_equal(existing_purchase, request_purchase, metadata)) {
        // todo user mark fraud here
        await user_mark_fraud(request_purchase.user_id);
        throw new Error('Idempotency Collision');
    }
    const assessment = await resolve_purchase(existing_purchase);
    if (assessment.hasOwnProperty('error')) {
        throw new Error(assessment.error);
    }
    if (!assessment) {
        return fatal_error({
            error: 'Expected assessment'
        });
    }
    return assessment;
};