const validate = require('../../../validation/validate.js');
const schema = {
    type: 'object',
    properties: {
        idempotency_key: {
            type: 'string',
            minLength: 36,
            maxLength: 36,
            pattern: /[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}/i
        },
        internal_purchase_id: {
            type: 'string',
            minLength: 36,
            maxLength: 36,
            pattern: /[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}/i
        },
        payment_id: {
            type: 'string',
            minLength: 36,
            maxLength: 36,
            pattern: /[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}/i
        },
        reason: {
            type: 'string',
            enum: [
                'duplicate',
                'fraudulent',
                'requested_by_customer',
                'bank_transaction_error',
                'invalid_account_number',
                'insufficient_funds',
                'payment_stopped_by_issuer',
                'payment_returned',
                'bank_account_ineligible',
                'invalid_ach_rtn',
                'unauthorized_transaction',
                'payment_failed'
            ]
        }
    },
    required: [
        'idempotency_key',
        'internal_purchase_id',
        'payment_id',
        'reason'
    ],
    additionalProperties: false
};

module.exports = (body) => {
    validate(body, schema);
    return;
};