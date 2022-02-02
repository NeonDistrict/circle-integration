const is_valid_skip = require('../validation/is_valid_skip.js');
const is_valid_limit = require('../validation/is_valid_limit.js');

module.exports = paginate_lingering_purchases = (config, query, skip, limit, cb) => {
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
    return query(text, values, (error, result) => {
        if (error) {
            return cb({
                error: 'Server Error'
            });
        }
        return cb(null, result.rows);
    });
};