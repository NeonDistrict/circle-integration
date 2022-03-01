const validate = require('../../../validation/validate.js');
const type_uuid = require('../../../../validation/type_uuid.js');
const type_payment_refund_cancel_reason = require('../../../../validation/type_payment_refund_cancel_reason.js');

const schema = {
    type: 'object',
    properties: {
        idempotency_key: type_uuid,
        internal_purchase_id: type_uuid,
        payment_id: type_uuid,
        reason: type_payment_refund_cancel_reason
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