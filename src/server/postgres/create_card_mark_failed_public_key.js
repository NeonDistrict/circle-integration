const is_valid_uuid = require('../validation/is_valid_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = create_card_mark_failed_public_key = (
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
            "t_modified_create_card"      = $2,
            "create_card_result"          = $3,
            "public_key_result"           = $4,
            "purchase_result"             = $5
        WHERE
            "internal_purchase_id"        = $6
        LIMIT 1;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        now,                         // "t_created_create_card"
        now,                         // "t_modified_create_card"
        'FAILED',                    // "create_card_result"
        'FAILED',                    // "public_key_result",
        'FAILED',                    // "purchase_result"
        internal_purchase_id         // "internal_purchase_id"
    ];

    return query(text, values, (error, result) => expect_one_row_count(error, result, cb));
};