const postgres = require('./postgres.js');
const fatal_error = require('../fatal_error.js');
const validate_uuid = require('../validation/validate_uuid.js');
const purchase_log = require('../purchase_log.js');

module.exports = find_purchase_by_internal_purchase_id = async (internal_purchase_id) => {
    // todo, maybe this just goes into an open log? since its not a purchase id to find another purchase id
    purchase_log('none', {
        event: 'find_purchase_by_internal_purchase_id'
    });
    validate_uuid(internal_purchase_id);
    const text = 
    `
        SELECT * FROM "purchases"
        WHERE
            "internal_purchase_id" = $1
        LIMIT 1;
    `;
    const values = [
        internal_purchase_id // "internal_purchase_id"
    ];
    const result = await postgres.query(text, values);
    // todo we need a 0/1 function
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