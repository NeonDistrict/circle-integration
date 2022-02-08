const fatal_error = require('../fatal_error.js');
const is_valid_uuid = require('../validation/is_valid_uuid.js');
const purchase_log = require('../purchase_log.js');

module.exports = find_purchase_by_client_generated_idempotency_key = (config, query, client_generated_idempotency_key, cb) => {
    // todo, maybe this just goes into an open log? since its not a purchase id to find another purchase id
    purchase_log('none', {
        event: 'find_purchase_by_client_generated_idempotency_key'
    });
    
    if (!is_valid_uuid(client_generated_idempotency_key)) {
        return cb({
            error: 'Invalid client_generated_idempotency_key'
        });
    }
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
    return query(text, values, (error, result) => {
        if (error) {
            return cb({
                error: 'Server Error'
            });
        }
        if (result.rows.length === 0) {
            return cb(null, null);
        }
        if (result.rows.length === 1) {
            return cb(null, result.rows[0]);
        }
        return fatal_error({
            error: 'Query rows.length !== 1 or 0'
        });
    });
};