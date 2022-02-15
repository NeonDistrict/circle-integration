const paginate_purchases_by_user_id = require('./postgres/paginate_purchases_by_user_id.js');

module.exports = purchase_history = async (request_purchase_history) => {
    return await paginate_purchases_by_user_id(request_purchase_history.user_id, request_purchase_history.skip, request_purchase_history.limit);
};