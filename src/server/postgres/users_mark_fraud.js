const postgres = require('./postgres.js');

module.exports = users_mark_fraud = async (user_ids) => {
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "users" SET
            "t_modified" = $1,
            "fraud"      = $2
        WHERE
            "user_id" = ANY ($3)
    `;
    const values = [
        now,     // "t_modified"
        true,    // "fraud"
        user_ids // "user_id" IN
    ];
    const result = await postgres.query(text, values);
    if (result.rowCount !== user_ids.length) {
        return fatal_error({
            error: 'Query rowCount !== user_ids.length'
        });
    }
    return result;
};