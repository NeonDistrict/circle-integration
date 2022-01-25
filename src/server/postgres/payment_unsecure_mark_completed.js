const is_valid_uuid = require('../validation/is_valid_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = payment_unsecure_mark_completed = (
    config, 
    query, 
    internal_purchase_id,
    payment_unsecure_id,
    cb
) => {
    if (!is_valid_uuid(internal_purchase_id)) {
        return cb({
            error: 'Invalid internal_purchase_id'
        });
    }
    if (!is_valid_uuid(payment_unsecure_id)) {
        return cb({
            error: 'Invalid payment_unsecure_id'
        });
    }
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_modified_payment_unsecure" = $2,
            "payment_unsecure_result"     = $3,
            "purchase_result"             = $4,
            "payment_unsecure_id"         = $5
        WHERE
            "internal_purchase_id"        = $5;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_modified_payment_unsecure"
        'COMPLETED',                 // "payment_unsecure_result"
        'COMPLETED',                 // "purchase_result"
        payment_unsecure_id,         // "payment_unsecure_id"
        internal_purchase_id         // "internal_purchase_id"
    ];

    return query(text, values, (error, result) => expect_one_row_count(error, result, cb));
};