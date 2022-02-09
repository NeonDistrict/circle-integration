const validate_uuid = require('../validation/validate_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = create_user = (
    config, 
    query, 
    user_id,
    cb
) => {
    validate_uuid(user_id)) {
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
    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};