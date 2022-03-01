const postgres = require('./postgres.js');
const single_row_or_null = require('./single_row_or_null.js');

module.exports = async (client_generated_idempotency_key) => {
    const text = 
    `
        SELECT * FROM "purchases"
        WHERE
            "client_generated_idempotency_key" = $1
        LIMIT 1;
    `;
    const values = [
        client_generated_idempotency_key // "client_generated_idempotency_key"
    ];
    const result = await postgres.query(text, values);
    return single_row_or_null(result);
};