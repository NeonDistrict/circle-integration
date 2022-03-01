const log = require('../utilities/log.js');
const create_payment_3ds = require('./create_payment_3ds.js');
const create_payment_cvv = require('./create_payment_cvv.js');
const create_payment_unsecure = require('./create_payment_unsecure.js');

module.exports = async (internal_purchase_id, card_id, request_purchase, sale_item) => {
    log({
        event: 'create payment',
        internal_purchase_id: internal_purchase_id,
        card_id: card_id,
        request_purchase: request_purchase,
        sale_item: sale_item
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
        log({
            event: 'create payment expected a 3ds unavailable response',
            internal_purchase_id: internal_purchase_id,
            card_id: card_id,
            request_purchase: request_purchase,
            sale_item: sale_item,
            note: 'a 3ds payment results in either an error, a redirect, a completed purchase, or unavailable - reaching here implies that unavailable was the only other option and thats not what came back'
        });
        throw new Error('Internal Server Error');
    }

    // fall back and attempt cvv payment
    const payment_cvv_assessment = await create_payment_cvv(internal_purchase_id, card_id, request_purchase, sale_item);
    if (payment_cvv_assessment.hasOwnProperty('internal_purchase_id')) {
        return payment_cvv_assessment;
    }
    if (!payment_cvv_assessment.hasOwnProperty('unavailable')) {
        log({
            event: 'create payment expected a cvv unavailable response',
            internal_purchase_id: internal_purchase_id,
            card_id: card_id,
            request_purchase: request_purchase,
            sale_item: sale_item,
            note: 'a cvv payment results in either an error, a completed purchase, or unavailable - reaching here implies that unavailable was the only other option and thats not what came back'
        });
        throw new Error('Internal Server Error');
    }

    // fall back and attempt unsecure payment
    const payment_unsecure_result = await create_payment_unsecure(internal_purchase_id, card_id, request_purchase, sale_item);
    if (payment_unsecure_result.hasOwnProperty('internal_purchase_id')) {
        return payment_unsecure_result;
    }
    
    log({
        event: 'create payment unexpected resolution',
        internal_purchase_id: internal_purchase_id,
        card_id: card_id,
        request_purchase: request_purchase,
        sale_item: sale_item,
        note: 'an unsecure payment results in either an error or a completed purchase - reaching here implies that neither of those happened, which should never be possible'
    });
    throw new Error('Internal Server Error');
};