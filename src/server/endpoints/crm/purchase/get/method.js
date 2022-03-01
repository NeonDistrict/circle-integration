const log = require('../../../../utilities/log.js');
const find_purchase_by_internal_purchase_id = require('../../../../postgres/find_purchase_by_internal_purchase_id.js');

module.exports = async (body) => {
    log({
        event: 'crm purchase get',
        body: body
    });
    const purchase = await find_purchase_by_internal_purchase_id(body.internal_purchase_id);
    if (purchase === null) {
        log({
            event: 'crm purchase get purchase not found',
            body: body
        });
        throw new Error('Puchase Not Found');
    }
    return purchase;
};