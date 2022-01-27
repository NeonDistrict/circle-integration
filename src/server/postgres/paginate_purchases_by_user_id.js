const is_valid_uuid = require('../validation/is_valid_uuid.js');
const is_valid_skip = require('../validation/is_valid_skip.js');
const is_valid_limit = require('../validation/is_valid_limit.js');

module.exports = paginate_purchases_by_user_id = (config, query, user_id, skip, limit, cb) => {
    if (!is_valid_uuid(user_id)) {
        return cb({
            error: 'Invalid user_id'
        });
    }
    if (!is_valid_skip(skip)) {
        return cb({
            error: 'Invalid skip'
        });
    }
    if (!is_valid_limit(limit)) {
        return cb({
            error: 'Invalid limit'
        });
    }
    if (limit > config.max_pagination_limit) {
        return cb({
            error: 'Limit Too Large',
            maximum: config.max_pagination_limit
        });
    }
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
    return query(text, values, (error, result) => {
        if (error) {
            return cb({
                error: 'Server Error'
            });
        }
        return cb(null, result.rows);
    });
};