const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = async (internal_purchase_id, payment_3ds_id) => {
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
            "internal_purchase_id"        = $6;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_modified_payment_3ds"
        'COMPLETED',                 // "payment_3ds_result"
        'COMPLETED',                 // "purchase_result"
        payment_3ds_id,              // "payment_3ds_id"
        internal_purchase_id         // "internal_purchase_id"
    ];

    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};