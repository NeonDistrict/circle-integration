const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../utilities/purchase_log.js');

module.exports = purchase_mark_refunded = async (internal_purchase_id) => {
    purchase_log(internal_purchase_id, {
        event: 'purchase_mark_refunded'
    });
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
        'REFUNDED',                  // "purchase_result"
        internal_purchase_id         // "internal_purchase_id"
    ];

    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};