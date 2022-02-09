const paginate_purchases_by_user_id = require('./postgres/paginate_purchases_by_user_id.js');

module.exports = purchase_history = async (user_id, skip, limit) => {
    return await paginate_purchases_by_user_id(user_id, skip, limit);
};