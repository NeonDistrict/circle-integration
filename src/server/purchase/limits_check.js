const log = require('../utilities/log.js');
const config = require('../../config');
const find_limits_by_user_id = require('../postgres/find_limits_by_user_id.js');
const find_limits_by_metadata_hash_card_number = require('../postgres/find_limits_by_metadata_hash_card_number.js');

module.exports = async (internal_purchase_id, request_purchase, metadata, sale_item) => {
    const now = new Date().getTime();
    const one_week_ago = now - 604800000;
    const one_day_ago = now - 86400000;

    log({
        event: 'limits check',
        internal_purchase_id: internal_purchase_id,
        request_purchase: request_purchase,
        metadata: metadata,
        sale_item: sale_item,
        now: now,
        one_week_ago: one_week_ago,
        one_day_ago: one_day_ago
    });
    
    const calculate_limits_from_purchase_rows = (purchase_rows) => {
        const limits = {
            daily: {
                used: 0,
                remaining: config.purchase_limits.daily
            },
            weekly: {
                used: 0,
                remaining: config.purchase_limits.weekly
            },
            monthly: {
                used: 0,
                remaining: config.purchase_limits.monthly
            }
        };
        for (const purchase_row of purchase_rows) {
            const sale_item_price = parseFloat(purchase_row.sale_item_price);
            limits.monthly.used += sale_item_price;
            limits.monthly.remaining -= sale_item_price;
            if (purchase_row.t_created_purchase > one_week_ago) {
                limits.weekly.used += sale_item_price;
                limits.weekly.remaining -= sale_item_price;
            }
            if (purchase_row.t_created_purchase > one_day_ago) {
                limits.daily.used += sale_item_price;
                limits.daily.remaining -= sale_item_price;
            }
        }
        return limits;
    };

    const sale_item_price = parseFloat(sale_item.sale_item_price);
    const purchases_by_user_id = await find_limits_by_user_id(request_purchase.user_id);
    const user_limits = calculate_limits_from_purchase_rows(purchases_by_user_id);
    const purchases_by_metadata_hash_card_number = await find_limits_by_metadata_hash_card_number(metadata.card_number);
    const card_limits = calculate_limits_from_purchase_rows(purchases_by_metadata_hash_card_number);

    log({
        event: 'limits check results',
        internal_purchase_id: internal_purchase_id,
        request_purchase: request_purchase,
        metadata: metadata,
        sale_item: sale_item,
        now: now,
        one_week_ago: one_week_ago,
        one_day_ago: one_day_ago,
        sale_item_price: sale_item_price,
        purchases_by_user_id: purchases_by_user_id,
        purchases_by_metadata_hash_card_number: purchases_by_metadata_hash_card_number,
        user_limits: user_limits,
        card_limits: card_limits
    });

    if (user_limits.daily.remaining - sale_item_price < 0) {
        throw new Error('Purchase Would Exceed Daily Limit For User');
    }
    if (user_limits.weekly.remaining - sale_item_price < 0) {
        throw new Error('Purchase Would Exceed Weekly Limit For User');
    }
    if (user_limits.monthly.remaining - sale_item_price < 0) {
        throw new Error('Purchase Would Exceed Monthly Limit For User');
    }
    
    if (card_limits.daily.remaining - sale_item_price < 0) {
        throw new Error('Purchase Would Exceed Daily Limit For Card');
    }
    if (card_limits.weekly.remaining - sale_item_price < 0) {
        throw new Error('Purchase Would Exceed Weekly Limit For Card');
    }
    if (card_limits.monthly.remaining - sale_item_price < 0) {
        throw new Error('Purchase Would Exceed Monthly Limit For Card');
    }
};