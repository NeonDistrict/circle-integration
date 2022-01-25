const fatal_error = require('../fatal_error.js');
const is_valid_uuid = require('../validation/is_valid_uuid.js');

module.exports = payment_cvv_start = (
    config, 
    query, 
    internal_purchase_id,
    payment_cvv_idempotency_key,
    cb
) => {
    if (!is_valid_uuid(internal_purchase_id)) {
        return cb({
            error: 'Invalid internal_purchase_id'
        });
    }
    if (!is_valid_uuid(payment_cvv_idempotency_key)) {
        return cb({
            error: 'Invalid payment_cvv_idempotency_key'
        });
    }
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

    return query(text, values, (error, result) => {
        if (error) {
            return cb({
                error: 'Server Error'
            });
        }
        if (result.rowCount !== 1) {
            return fatal_error({
                error: 'Query rowCount !== 1'
            });
        }
        return cb(null);
    });
};