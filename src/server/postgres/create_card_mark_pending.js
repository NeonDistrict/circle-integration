const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../utilities/purchase_log.js');

module.exports = create_card_mark_pending = async (internal_purchase_id, create_card_id) => {
    purchase_log(internal_purchase_id, {
        event: 'create_card_mark_pending'
    });
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_modified_create_card"      = $2,
            "create_card_result"          = $3,
            "create_card_id"              = $4
        WHERE
            "internal_purchase_id"        = $5;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_modified_create_card"
        'PENDING',                   // "create_card_result"
        create_card_id,              // "create_card_id"
        internal_purchase_id         // "internal_purchase_id"
    ];
    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};