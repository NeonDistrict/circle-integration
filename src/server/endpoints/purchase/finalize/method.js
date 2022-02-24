const assess_payment_result = require('../../../payment/assess_payment_result.js');
const purchase_log = require('../../../utilities/purchase_log.js');
const parking = require('../../../utilities/parking.js');
const resolve_purchase = require('../../../purchase/resolve_purchase.js');
const find_purchase_by_internal_purchase_id = require('../../../postgres/find_purchase_by_internal_purchase_id.js');
const payment_3ds_mark_failed = require('../../../postgres/payment_3ds_mark_failed.js');
const payment_3ds_mark_fraud = require('../../..//postgres/payment_3ds_mark_fraud.js');
const payment_3ds_mark_unavailable = require('../../../postgres/payment_3ds_mark_unavailable.js');
const payment_3ds_mark_redirected = require('../../../postgres/payment_3ds_mark_redirected.js');
const payment_3ds_mark_pending = require('../../..//postgres/payment_3ds_mark_pending.js');
const payment_3ds_mark_completed = require('../../../postgres/payment_3ds_mark_completed.js');

module.exports = async (body) => {
    purchase_log(body.internal_purchase_id, {
        event: 'purchase_finalize',
        details: {
            internal_purchase_id: body.internal_purchase_id,
            body: body
        }
    });

    const purchase = await find_purchase_by_internal_purchase_id(body.internal_purchase_id);
    if (purchase === null) {
        throw new Error('Purchase Not Found');
    }
    if (purchase.purchase_result === 'PENDING' && purchase.payment_3ds_result === 'REDIRECTED') {
        const payment_result = await new Promise((resolve, reject) => {
            return parking.park_callback(purchase.payment_3ds_id, (error, payment_result) => {
                if (error) {
                    return reject(error);
                }
                return resolve(payment_result);
            });
        });
        const mark_failed      = payment_3ds_mark_failed;
        const mark_fraud       = payment_3ds_mark_fraud;
        const mark_unavailable = payment_3ds_mark_unavailable;
        const mark_redirected  = payment_3ds_mark_redirected;
        const mark_pending     = payment_3ds_mark_pending;
        const mark_completed   = payment_3ds_mark_completed;
        const payment_3ds_assessment = await assess_payment_result(body.internal_purchase_id, body.user_id, payment_result, mark_failed, mark_fraud, mark_unavailable, mark_redirected, mark_pending, mark_completed);
        return payment_3ds_assessment;
    } else {
        return await resolve_purchase(purchase);
    }
};