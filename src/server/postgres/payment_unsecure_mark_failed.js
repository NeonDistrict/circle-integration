const fatal_error = require('../fatal_error.js');
const is_valid_uuid = require('../validation/is_valid_uuid.js');

module.exports = payment_unsecure_mark_failed = (
    config, 
    query, 
    internal_purchase_id,
    cb
) => {
    if (!is_valid_uuid(internal_purchase_id)) {
        return cb({
            error: 'Invalid internal_purchase_id'
        });
    }
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_modified_payment_unsecure" = $2,
            "payment_unsecure_result"     = $3,
            "purchase_result"             = $4
        WHERE
            "internal_purchase_id"        = $5;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_modified_payment_unsecure"
        'FAILED',                    // "payment_unsecure_result"
        'FAILED',                    // "purchase_result"
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