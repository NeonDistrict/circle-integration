const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = user_mark_fraud = async (user_id) => {
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "users" SET
            "t_modified" = $1,
            "fraud"      = $2
        WHERE
            "user_id"    = $3;
    `;
    const values = [
        now,    // "t_modified"
        true,   // "fraud"
        user_id // "user_id"
    ];
    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};