const postgres = require('./postgres.js');

module.exports = async (user_id, skip, limit) => {
    const text = 
    `
        SELECT 
            *
        FROM "purchases"
        WHERE
            "user_id" = $1
        ORDER BY "t_created_purchase" DESC 
        LIMIT $2
        OFFSET $3;
    `;
    const values = [
        user_id, // "user_id"
        limit,   // limit
        skip     // offset (skip)
    ];
    const result = await postgres.query(text, values);
    return result.rows;
};