const config = require('../../config.js');
const postgres = require('./postgres.js');
const validate_uuid = require('../validation/validate_uuid.js');
const validate_skip = require('../validation/validate_skip.js');
const validate_limit = require('../validation/validate_limit.js');

module.exports = paginate_purchases_by_user_id = async (user_id, skip, limit) => {
    validate_uuid(user_id);
    validate_skip(skip);
    validate_limit(limit);
    const text = 
    `
        SELECT 
            "internal_purchase_id",
            "user_id",
            "sale_item_key",
            "sale_item_price",
            "game_id",
            "t_created_purchase",
            "t_modified_purchase",
            "game_credited_result",
            "purchase_result",
            "create_card_result",
            "public_key_result",
            "payment_3ds_result",
            "payment_cvv_result",
            "payment_unsecure_result"
        FROM "purchases"
        WHERE
            "user_id" = $1
        ORDER BY "t_created_purchase" DESC 
        LIMIT $2
        OFFSET $3;
    `; // todo is desc right?
    const values = [
        user_id, // "user_id"
        limit,   // limit
        skip     // offset (skip)
    ];
    const result = await postgres.query(text, values);
    return result.rows;
};