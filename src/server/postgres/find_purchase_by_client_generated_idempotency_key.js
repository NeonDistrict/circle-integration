const postgres = require('./postgres.js');
const fatal_error = require('../utilities/fatal_error.js');
const purchase_log = require('../utilities/purchase_log.js');

module.exports = async (client_generated_idempotency_key) => {
    // todo, maybe this just goes into an open log? since its not a purchase id to find another purchase id
    purchase_log('none', {
        event: 'find_purchase_by_client_generated_idempotency_key'
    });
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
    if (result.rows.length === 0) {
        return null;
    }
    if (result.rows.length === 1) {
        return result.rows[0];
    }
    return fatal_error({
        error: 'Query rows.length !== 1 or 0'
    });
};