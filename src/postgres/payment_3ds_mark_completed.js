const is_valid_uuid = require('../validation/is_valid_uuid.js');

module.exports = payment_3ds_mark_completed = (
    config, 
    query, 
    internal_purchase_id,
    payment_3ds_id,
    cb
) => {
    if (!is_valid_uuid(internal_purchase_id)) {
        return cb({
            error: 'Invalid internal_purchase_id'
        });
    }
    if (!is_valid_uuid(payment_3ds_id)) {
        return cb({
            error: 'Invalid payment_3ds_id'
        });
    }
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_modified_payment_3ds"      = $2,
            "payment_3ds_result"          = $3,
            "purchase_result"             = $4,
            "payment_3ds_id"              = $5
        WHERE
            "internal_purchase_id"        = $5;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_modified_payment_3ds"
        'COMPLETED',                 // "payment_3ds_result"
        'COMPLETED',                 // "purchase_result"
        payment_3ds_id,              // "payment_3ds_id"
        internal_purchase_id         // "internal_purchase_id"
    ];

    // todo this query should run then puke if not exactly 1 row is updated
    return query(text, values, cb);
};