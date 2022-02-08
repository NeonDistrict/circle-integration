const is_valid_uuid = require('../validation/is_valid_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../purchase_log.js');

module.exports = purchase_mark_fraud = (config, query, internal_purchase_id, cb) => {
    purchase_log(internal_purchase_id, {
        event: 'purchase_mark_fraud'
    });
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
            "purchase_result"             = $2
        WHERE
            "internal_purchase_id"        = $3;
    `;
    const values = [
        now,                         // "t_modified_purchase"
        'FRAUD',                     // "purchase_result"
        internal_purchase_id         // "internal_purchase_id"
    ];

    return query(text, values, (error, result) => expect_one_row_count(error, result, cb));
};