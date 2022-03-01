const postgres = require('./postgres.js');

module.exports = async (user_id) => {
    // get the last 31 days of purchases that completed
    const now = new Date().getTime();
    const one_month_ago = now - 2678400000;
    const text = 
    `
        SELECT 
            "sale_item_price",
            "t_created_purchase"
        FROM "purchases"
        WHERE
            "user_id" = $1 AND
            "purchase_result" = 'COMPLETED' AND
            "t_created_purchase" > $2
        ORDER BY "t_created_purchase" DESC
    `;
    const values = [
        user_id,       // "user_id"
        one_month_ago //  "t_created_purchase" > $2 
    ];
    const result = await postgres.query(text, values);
    return result.rows;
};