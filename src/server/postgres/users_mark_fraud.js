const log = require('../utilities/log.js');
const postgres = require('./postgres.js');

module.exports = async (user_ids) => {
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
        log({
            event: 'users mark fraud user_ids / rowCount mismatch',
            note: 'somehow not all users were marked fraud, perhaps there was a duplicate or those users were deleted',
            user_ids: user_ids,
            result: result
        }, true);
        throw new Error('Internal Server Error');
    }
    return result;
};