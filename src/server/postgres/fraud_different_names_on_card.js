const postgres = require('./postgres.js');

module.exports = async (user_id, metadata_hash_name_on_card) => {
    // note: finds OTHER names on card other than the one provided, any rows implies another name
    // was used than the one provided and is fraud
    const text = 
    `
        SELECT DISTINCT "metadata_hash_name_on_card" FROM "purchases"
        WHERE
            "user_id"                     = $1 AND
            "metadata_hash_name_on_card" != $2;
    `;
    const values = [
        user_id,                   // "user_id"
        metadata_hash_name_on_card // "metadata_hash_name_on_card"
    ];
    const result = await postgres.query(text, values);
    return result.rows;
};