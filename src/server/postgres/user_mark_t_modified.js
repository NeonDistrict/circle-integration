const is_valid_uuid = require('../validation/is_valid_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = user_mark_t_modified = (config, query, user_id, cb) => {
    if (!is_valid_uuid(user_id)) {
        return cb({
            error: 'Invalid user_id'
        });
    }
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "users" SET
            "t_modified" = $1
        WHERE
            "user_id"    = $2
        LIMIT 1;
    `;
    const values = [
        now,    // "t_modified"
        user_id // "user_id"
    ];
    return query(text, values, (error, result) => expect_one_row_count(error, result, cb));
};