const is_valid_uuid = require('../validation/is_valid_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = payment_3ds_start = (config, query, internal_purchase_id, payment_3ds_idempotency_key, cb) => {
    if (!is_valid_uuid(internal_purchase_id)) {
        return cb({
            error: 'Invalid internal_purchase_id'
        });
    }
    if (!is_valid_uuid(payment_3ds_idempotency_key)) {
        return cb({
            error: 'Invalid payment_3ds_idempotency_key'
        });
    }
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_created_payment_3ds"       = $2,
            "t_modified_payment_3ds"      = $3,
            "payment_3ds_idempotency_key" = $4,
            "payment_3ds_result"          = $5
        WHERE
            "internal_purchase_id"        = $6
        LIMIT 1;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_created_payment_3ds"
        now,                         // "t_modified_payment_3ds"
        payment_3ds_idempotency_key, // "payment_3ds_idempotency_key"
        'REQUESTED',                 // "payment_3ds_result"
        internal_purchase_id         // "internal_purchase_id"
    ];

    return query(text, values, (error, result) => expect_one_row_count(error, result, cb));
};