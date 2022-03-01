const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = async (internal_purchase_id, payment_unsecure_id) => {
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_modified_payment_unsecure" = $2,
            "payment_unsecure_result"     = $3,
            "payment_unsecure_id"         = $4
        WHERE
            "internal_purchase_id"        = $5;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_modified_payment_unsecure"
        'PENDING',                   // "payment_unsecure_result"
        payment_unsecure_id,         // "payment_unsecure_id"
        internal_purchase_id         // "internal_purchase_id"
    ];

    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};