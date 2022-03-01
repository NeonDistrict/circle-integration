const find_purchase_by_internal_purchase_id = require('../../../../postgres/find_purchase_by_internal_purchase_id.js');

module.exports = async (body) => {
    const purchase = await find_purchase_by_internal_purchase_id(body.internal_purchase_id);
    if (purchase === null) {
        throw new Error('Puchase Not Found');
    }
    return purchase;
};