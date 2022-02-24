const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = create_user = async (user_id) => {
    const now = new Date().getTime();
    const text = 
    `
        INSERT INTO "users" (
            "user_id",
            "t_created",
            "t_modified",
            "fraud"
        ) VALUES (
            $1, $2, $3, $4
        );
    `;
    const values = [
        user_id,     // "user_id"
        now,         // "t_created"
        now,         // "t_modified"
        false        // "fraud"
    ];
    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};