const postgres = require('./postgres.js');
const validate_uuid = require('../validation/validate_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../purchase_log.js');

module.exports = payment_unsecure_mark_completed = async (internal_purchase_id, payment_unsecure_id) => {
    purchase_log(internal_purchase_id, {
        event: 'payment_unsecure_mark_completed'
    });
    validate_uuid(internal_purchase_id);
    validate_uuid(payment_unsecure_id);
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
            "internal_purchase_id"        = $6;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_modified_payment_unsecure"
        'COMPLETED',                 // "payment_unsecure_result"
        'COMPLETED',                 // "purchase_result"
        payment_unsecure_id,         // "payment_unsecure_id"
        internal_purchase_id         // "internal_purchase_id"
    ];

    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};