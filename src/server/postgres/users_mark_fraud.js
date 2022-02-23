const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = users_mark_fraud = async (user_ids) => {
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "users" SET
            "t_modified" = $1,
            "fraud"      = $2
        WHERE
            "user_id" IN ($3::string[])
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