const validate_uuid = require('../validation/validate_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../purchase_log.js');

module.exports = payment_cvv_start = async (internal_purchase_id, payment_cvv_idempotency_key) => {
    purchase_log(internal_purchase_id, {
        event: 'payment_cvv_start'
    });
    validate_uuid(internal_purchase_id);
    validate_uuid(payment_cvv_idempotency_key);
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_created_payment_cvv"       = $2,
            "t_modified_payment_cvv"      = $3,
            "payment_cvv_idempotency_key" = $4,
            "payment_cvv_result"          = $5
        WHERE
            "internal_purchase_id"        = $6;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_created_payment_cvv"
        now,                         // "t_modified_payment_cvv"
        payment_cvv_idempotency_key, // "payment_cvv_idempotency_key"
        'REQUESTED',                 // "payment_cvv_result"
        internal_purchase_id         // "internal_purchase_id"
    ];

    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};