const config = require('../../config.js');
const postgres = require('./postgres.js');

module.exports = async (skip, limit) => {
    const now = new Date().getTime();
    const lingering_time = now - config.purchase_lingering_after;
    const text = 
    `
        SELECT * FROM "purchases"
        WHERE
            "purchase_result" = 'PENDING' AND
            "t_created_purchase" < $1
        ORDER BY "t_created_purchase" ASC
        LIMIT $2
        OFFSET $3;
    `;
    const values = [
        lingering_time, // "t_created_purchase" < X
        limit,          // limit
        skip            // offset (skip)
    ];
    const result = await postgres.query(text, values);
    return result.rows;
};