const postgres = require('./postgres.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = create_user = async (user) => {
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
        user.user_id,     // "user_id"
        user.t_created,   // "t_created"
        user.t_modified,  // "t_modified"
        user.fraud        // "fraud"
    ];
    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};