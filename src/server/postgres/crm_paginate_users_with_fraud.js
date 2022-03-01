const postgres = require('./postgres.js');

module.exports = paginate_purchases_by_user_id = async (user_id, skip, limit) => {
    const text = 
    `
        SELECT 
            *
        FROM "users"
        WHERE
            "fraud" = true
        ORDER BY "t_created" DESC 
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