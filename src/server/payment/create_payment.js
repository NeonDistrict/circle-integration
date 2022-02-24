const fatal_error = require('../utilities/fatal_error.js');
const create_payment_3ds = require('./create_payment_3ds.js');
const create_payment_cvv = require('./create_payment_cvv.js');
const create_payment_unsecure = require('./create_payment_unsecure.js');
const purchase_log = require('../utilities/purchase_log.js');

module.exports = create_payment = async (internal_purchase_id, card_id, request_purchase, sale_item) => {
    purchase_log(internal_purchase_id, {
        event: 'create_payment',
        details: {
            internal_purchase_id: internal_purchase_id, 
            card_id: card_id, 
            request_purchase: request_purchase,
            sale_item: sale_item
        }
    });

    // attempt 3ds payment
    const payment_3ds_assessment = await create_payment_3ds(internal_purchase_id, card_id, request_purchase, sale_item);
    if (payment_3ds_assessment.hasOwnProperty('redirect')) {
        return payment_3ds_assessment;
    }
    if (payment_3ds_assessment.hasOwnProperty('internal_purchase_id')) {
        return payment_3ds_assessment;
    }
    if (!payment_3ds_assessment.hasOwnProperty('unavailable')) {
        return fatal_error({
            error: 'Expected Unavailable Payment 3DS'
        });
    }

    // fall back and attempt cvv payment
    const payment_cvv_assessment = await create_payment_cvv(internal_purchase_id, card_id, request_purchase, sale_item);
    if (payment_cvv_assessment.hasOwnProperty('internal_purchase_id')) {
        return payment_cvv_assessment;
    }
    if (!payment_cvv_assessment.hasOwnProperty('unavailable')) {
        return fatal_error({
            error: 'Expected Unavailable Payment CVV'
        });
    }

    // fall back and attempt unsecure payment
    const payment_unsecure_result = await create_payment_unsecure(internal_purchase_id, card_id, request_purchase, sale_item);
    if (payment_unsecure_result.hasOwnProperty('internal_purchase_id')) {
        return payment_unsecure_result;
    }
    return fatal_error({
        error: 'Unexpected Resolution Payment Unsecure'
    });
};