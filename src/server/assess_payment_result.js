const payment_status_enum = require('./enum/payment_status_enum.js');
const assess_payment_risk = require('./assess_payment_risk.js');
const assess_payment_failure = require('./assess_payment_failure.js');
const parking = require('./parking.js');
const postgres = require('./postgres/postgres.js');

module.exports = assess_payment_result = (payment_result, cb) => {
    // todo does risk come back as failed? or some other result?
    // this could go into the switch then
    const risk_error = assess_payment_risk(payment_result);
    if (risk_error) {
        return cb(risk_error);
    }

    const payment_id = payment_result.id; // todo is this the id?

    // todo can we get the type of verification from the result and
    // choose the db calls based on that? otherwise if its a param parking would need a weird updates

    // check the status
    switch (payment_result.status) {

        // confirmed and paid are equivalent for considering the payment a success, paid just implies its in our wallet now
        case payment_status_enum.CONFIRMED:
        case payment_status_enum.PAID:
            return postgres.payment_3ds_mark_completed(internal_purchase_id, payment_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb(null, null, payment_id);
            });

        // failed implies that the the payment is complete and will never be successful, figure out what the reason was to
        // determine what we tell the player and if they should retry the payment or not (with a new payment)
        case payment_status_enum.FAILED:
            const payment_failure_error = assess_payment_failure(payment_result);
            return cb(payment_failure_error);
        
        // pending implies we will need to wait for an aws sns callback when the payment action resolves
        case payment_status_enum.PENDING:
            return postgres.payment_3ds_mark_pending(internal_purchase_id, payment_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return parking.park_callback(payment_result.id, (error, payment_result) => {
                    if (error) {
                        return cb(error);
                    }
                    // assess the new result
                    return assess_payment_result(payment_result, cb);
                });
            });

        // action required means the player will need to be redirected to verify payment
        case payment_status_enum.ACTION_REQUIRED:
            return postgres.payment_3ds_mark_redirected(internal_purchase_id, payment_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb(null, {
                    redirect: payment_result.requiredAction.redirectUrl
                });
            });
            
        // handle unexpected status
        default:
            return cb({
                error: 'Unexpected Payment Status'
            });
    }
};