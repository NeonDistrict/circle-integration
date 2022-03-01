const log = require('../../../../utilities/log.js');
const call_circle = require('../../../../utilities/call_circle.js');
const parking = require('../../../../utilities/parking.js');
const find_purchase_by_internal_purchase_id = require('../../../../postgres/find_purchase_by_internal_purchase_id.js');
const purchase_mark_refunded = require('../../../../postgres/purchase_mark_refunded.js');

module.exports = async (body) => {
    log({
        event: 'crm payment refund',
        body: body
    });
    const purchase = await find_purchase_by_internal_purchase_id(body.internal_purchase_id);
    if (purchase === null) {
        log({
            event: 'crm payment refund could not find purchase',
            body: body
        });
        throw new Error('Purchase Not Found');
    }
    if (purchase.purchase_result !== 'COMPLETED') {
        log({
            event: 'crm payment refund could not refund on a non completed purchase',
            body: body,
            purchase: purchase
        });
        throw new Error('Cannot Refund a Non-Completed Purchase');
    }
    const purchase_amount = purchase.sale_item_price;
    let circle_response = await call_circle(null, [200, 201], 'post', `/payments/${body.payment_id}/refund`, {
        idempotencyKey: body.idempotency_key,
        amount: {
            amount: purchase_amount,
            currency: 'USD'
        },
        reason: body.reason
    });
    if (circle_response.status === 'pending') {
        circle_response = await new Promise((resolve, reject) => {
            parking.park_callback(circle_response.id, (error, circle_response) => {
                if (error) {
                    return reject(error);
                }
                return resolve(circle_response);
            });
        });
    }
    if (circle_response.status !== 'paid' && circle_response.status !== 'confirmed') {
        log({
            event: 'crm payment refund failed',
            body: body,
            circle_response: circle_response
        });
        throw new Error('Refund Failed');
    }
    await purchase_mark_refunded(body.internal_purchase_id);
    return {refunded: 1};
};