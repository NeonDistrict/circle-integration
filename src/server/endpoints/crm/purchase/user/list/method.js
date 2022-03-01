const crm_paginate_purchases_by_user_id = require('../../../../../postgres/crm_paginate_purchases_by_user_id');

module.exports = async (body) => {
    const purchases = await crm_paginate_purchases_by_user_id(body.user_id, body.skip, body.limit);
    return purchases;
};