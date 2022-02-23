const postgres = require('./postgres.js');

module.exports = fraud_card_number_used_by_another_user_id = async (user_id, metadata_hash_card_number) => {
    // note: finds any OTHER users than the provided user who are also using the same card number
    // null implies no other users are using the same card number, any rows implies other users using
    // the same card number
    const text = 
    `
        SELECT DISTINCT "user_id" FROM "purchases"
        WHERE
            "user_id"                   != $1 AND
            "metadata_hash_card_number"  = $2;
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