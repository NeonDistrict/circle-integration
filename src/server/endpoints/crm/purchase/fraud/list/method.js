const log = require('../../../../../utilities/log.js');
const crm_paginate_purchases_with_fraud = require('../../../../../postgres/crm_paginate_purchases_with_fraud.js');

module.exports = async (body) => {
    log({
        event: 'crm purchase fraud list',
        body: body
    });
    const purchases = await crm_paginate_purchases_with_fraud(body.skip, body.limit);
    return purchases;
};