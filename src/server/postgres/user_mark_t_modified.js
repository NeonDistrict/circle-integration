const postgres = require('./postgres.js');
const validate_uuid = require('../validation/validate_uuid.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = user_mark_t_modified = async (user_id) => {
    validate_uuid(user_id);
    const now = new Date().getTime();
    const text = 
    `
        UPDATE "users" SET
            "t_modified" = $1
        WHERE
            "user_id"    = $2;
    `;
    const values = [
        now,    // "t_modified"
        user_id // "user_id"
    ];
    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};