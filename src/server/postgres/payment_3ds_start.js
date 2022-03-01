const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../utilities/purchase_log.js');

module.exports = async (internal_purchase_id, payment_3ds_idempotency_key) => {
    purchase_log(internal_purchase_id, {
        event: 'payment_3ds_start'
    });
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
            "internal_purchase_id"        = $6;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_created_payment_3ds"
        now,                         // "t_modified_payment_3ds"
        payment_3ds_idempotency_key, // "payment_3ds_idempotency_key"
        'REQUESTED',                 // "payment_3ds_result"
        internal_purchase_id         // "internal_purchase_id"
    ];

    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};