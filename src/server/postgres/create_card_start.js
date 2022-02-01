const is_valid_uuid = require('../validation/is_valid_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../purchase_log.js');

module.exports = create_card_start = (config, query, internal_purchase_id, create_card_idempotency_key, cb) => {
    purchase_log(internal_purchase_id, {
        event: 'create_card_start'
    });
    
    if (!is_valid_uuid(internal_purchase_id)) {
        return cb({
            error: 'Invalid internal_purchase_id'
        });
    }
    if (!is_valid_uuid(create_card_idempotency_key)) {
        return cb({
            error: 'Invalid create_card_idempotency_key'
        });
    }
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

    return query(text, values, (error, result) => expect_one_row_count(error, result, cb));
};