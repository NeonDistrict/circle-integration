const is_valid_uuid = require('../validation/is_valid_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = create_user = (
    config, 
    query, 
    user_id,
    cb
) => {
    if (!is_valid_uuid(user_id)) {
        return cb({
            error: 'Invalid user_id'
        });
    }
    const now = new Date().getTime();
    const text = 
    `
        INSERT INTO "users" (
            "user_id",
            "t_created",
            "t_modified",
            "fraud",
        ) VALUES (
            $1, $2, $3, $4, $5
        );
    `;
    const values = [
        user_id,     // "user_id"
        now,         // "t_created"
        now,         // "t_modified"
        false        // "fraud"
    ];
    return query(text, values, (error, result) => expect_one_row_count(error, result, cb));
};