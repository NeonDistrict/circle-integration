const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = async (internal_purchase_id, create_card_idempotency_key) => {
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_created_create_card"       = $2,
            "t_modified_create_card"      = $3,
            "create_card_idempotency_key" = $4,
            "create_card_result"          = $5
        WHERE
            "internal_purchase_id"        = $6;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_created_create_card"
        now,                         // "t_modified_create_card"
        create_card_idempotency_key, // "create_card_idempotency_key"
        'REQUESTED',                 // "create_card_result"
        internal_purchase_id         // "internal_purchase_id"
    ];

    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};