const payment_status_enum = require('./enum/payment_status_enum.js');
const assess_payment_failure = require('./assess_payment_failure.js');
const parking = require('./parking.js');

module.exports = assess_payment_result = (config, postgres, user, internal_purchase_id, payment_result, mark_failed, mark_fraud, mark_unavailable, mark_redirected, mark_pending, mark_completed, cb) => {
    switch (payment_result.status) {
        case payment_status_enum.CONFIRMED:
        case payment_status_enum.PAID:
            return mark_completed(internal_purchase_id, payment_result.id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb(null, {
                    payment_id: payment_result.id
                });
            });

        case payment_status_enum.FAILED:
            return assess_payment_failure(config, postgres, user, internal_purchase_id, payment_result, mark_failed, mark_fraud, mark_unavailable, mark_redirected, mark_pending, mark_completed, cb);
        
        case payment_status_enum.PENDING:
            return mark_pending(internal_purchase_id, payment_result.id, (error) => {
                if (error) {
                    return cb(error);
                }
                return parking.park_callback(payment_result.id, (error, payment_result) => {
                    if (error) {
                        return cb(error);
                    }
                    return assess_payment_result(config, postgres, user, internal_purchase_id, payment_result, mark_failed, mark_fraud, mark_unavailable, cb);
                });
            });

        case payment_status_enum.ACTION_REQUIRED:
            if (!mark_redirected) {
                return fatal_error({
                    error: 'Function Not Provided: mark_redirected'
                });
            }
            return mark_redirected(internal_purchase_id, payment_result.id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb(null, {
                    redirect: payment_result.requiredAction.redirectUrl
                });
            });
            
        default:
            return cb({
                error: 'Unexpected Payment Status'
            });
    }
};