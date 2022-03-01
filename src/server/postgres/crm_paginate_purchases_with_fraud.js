const postgres = require('./postgres.js');

module.exports = async (skip, limit) => {
    const text = 
    `
        SELECT 
            *
        FROM "purchases"
        WHERE
            "purchase_result" = 'FRAUD'
        ORDER BY "t_created_purchase" DESC 
        LIMIT $1
        OFFSET $2;
    `;
    const values = [
        limit,   // limit
        skip     // offset (skip)
    ];
    const result = await postgres.query(text, values);
    return result.rows;
};