const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../utilities/purchase_log.js');

module.exports = async (internal_purchase_id, payment_3ds_id) => {
    purchase_log(internal_purchase_id, {
        event: 'payment_3ds_mark_unavailable'
    });
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_modified_payment_3ds"      = $2,
            "payment_3ds_result"          = $3,
            "payment_3ds_id"              = $4
        WHERE
            "internal_purchase_id"        = $5;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_modified_payment_3ds"
        'UNAVAILABLE',               // "payment_3ds_result"
        payment_3ds_id,              // "payment_3ds_id"
        internal_purchase_id         // "internal_purchase_id"
    ];

    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};