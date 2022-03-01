const postgres = require('./postgres.js');

module.exports = async (user_id, metadata_hash_card_number) => {
    // note: finds all distinct card numbers used by a user id that arent the current card number
    // this means the total card numbers on the account is rows + 1
    const text = 
    `
        SELECT DISTINCT "metadata_hash_card_number" FROM "purchases"
        WHERE
            "user_id"                    = $1 AND
            "metadata_hash_card_number" != $2;
    `;
    const values = [
        user_id,                  // "user_id"
        metadata_hash_card_number // "metadata_hash_card_number"
    ];
    const result = await postgres.query(text, values);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows;
};