const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../utilities/purchase_log.js');

module.exports = async (internal_purchase_id, create_card_id) => {
    purchase_log(internal_purchase_id, {
        event: 'create_card_mark_failed_public_key'
    });
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_modified_create_card"      = $2,
            "create_card_result"          = $3,
            "public_key_result"           = $4,
            "purchase_result"             = $5,
            "create_card_id"              = $6
        WHERE
            "internal_purchase_id"        = $7;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_created_create_card"
        now,                         // "t_modified_create_card"
        'FAILED',                    // "create_card_result"
        'FAILED',                    // "public_key_result",
        'FAILED',                    // "purchase_result"
        create_card_id,              // "create_card_id"
        internal_purchase_id         // "internal_purchase_id"
    ];

    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};