const assess_payment_result = require('./assess_payment_result.js');
const purchase_log = require('./purchase_log.js');
const parking = require('./parking.js');

module.exports = purchase_finalize = async (config, postgres, user_id, internal_purchase_id, payment_id, cb) => {
    // todo: we should db get here to ensure internal purchase id

    purchase_log(internal_purchase_id, {
        event: 'purchase_finalize',
        details: {
            internal_purchase_id: internal_purchase_id,
            payment_id: payment_id
        }
    });

    return parking.park_callback(payment_id, (error, payment_result) => {
        if (error) {
            return cb(error);
        }
        const mark_failed      = postgres.payment_3ds_mark_failed;
        const mark_fraud       = postgres.payment_3ds_mark_fraud;
        const mark_unavailable = postgres.payment_3ds_mark_unavailable;
        const mark_redirected  = postgres.payment_3ds_mark_redirected;
        const mark_pending     = postgres.payment_3ds_mark_pending;
        const mark_completed   = postgres.payment_3ds_mark_completed;
        return assess_payment_result(config, postgres, internal_purchase_id, user_id, payment_result, mark_failed, mark_fraud, mark_unavailable, mark_redirected, mark_pending, mark_completed, cb);
    });
};