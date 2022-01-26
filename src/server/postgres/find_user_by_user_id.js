const fatal_error = require('../fatal_error.js');
const is_valid_uuid = require('../validation/is_valid_uuid.js');

module.exports = find_user_by_user_id = (config, query, user_id, cb) => {
    if (!is_valid_uuid(user_id)) {
        return cb({
            error: 'Invalid user_id'
        });
    }
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
    return query(text, values, (error, result) => {
        if (error) {
            return cb({
                error: 'Server Error'
            });
        }
        if (result.rows.length === 0) {
            return cb(null, null);
        }
        if (result.rows.length === 1) {
            return cb(null, result.rows[0]);
        }
        return fatal_error({
            error: 'Query rows.length !== 1 or 0'
        });
    });
};