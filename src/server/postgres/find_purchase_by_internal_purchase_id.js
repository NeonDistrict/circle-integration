const postgres = require('./postgres.js');
const single_row_or_null = require('./single_row_or_null.js');

module.exports = async (internal_purchase_id) => {
    const text = 
    `
        SELECT 
            * 
        FROM "purchases"
        WHERE
            "internal_purchase_id" = $1
        LIMIT 1;
    `;
    const values = [
        internal_purchase_id // "internal_purchase_id"
    ];
    const result = await postgres.query(text, values);
    return single_row_or_null(result);
};