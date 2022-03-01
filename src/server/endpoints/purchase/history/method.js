const log = require('../../../utilities/log.js');
const paginate_purchases_by_user_id = require('../../../postgres/paginate_purchases_by_user_id');

module.exports = async (body) => {
    log({
        event: 'purchase history',
        body: body
    });
    return await paginate_purchases_by_user_id(body.user_id, body.skip, body.limit);
};