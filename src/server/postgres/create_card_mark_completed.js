const postgres = require('./postgres.js');
const validate_uuid = require('../validation/validate_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../purchase_log.js');

module.exports = create_card_mark_failed = async (internal_purchase_id, create_card_id) => {
    purchase_log(internal_purchase_id, {
        event: 'create_card_mark_completed'
    });
    validate_uuid(internal_purchase_id);
    validate_uuid(create_card_id);
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "purchases" SET
            "t_modified_purchase"         = $1,
            "t_modified_create_card"      = $2,
            "create_card_result"          = $3,
            "public_key_result"           = $4,
            "create_card_id"              = $5
        WHERE
            "internal_purchase_id"        = $6;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_modified_create_card"
        'COMPLETED',                 // "create_card_result"
        'COMPLETED',                 // "public_key_result"
        create_card_id,              // "create_card_id"
        internal_purchase_id         // "internal_purchase_id"
    ];

    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};