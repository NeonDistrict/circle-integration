const postgres = require('./postgres.js');
const single_row_or_null = require('./single_row_or_null.js');

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
    return single_row_or_null(result);
};