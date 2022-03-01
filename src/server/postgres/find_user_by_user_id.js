const postgres = require('./postgres.js');
const fatal_error = require('../utilities/fatal_error.js');

module.exports = async (user_id) => {
    const text = 
    `
        SELECT * FROM "users"
        WHERE
            "user_id" = $1
        LIMIT 1;
    `;
    const values = [
        user_id // "user_id"
    ];
    const result = await postgres.query(text, values);
    // todo we have a couple of these 0 or 1s make it a function like expect 1
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