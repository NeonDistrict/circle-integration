const payment_status_enum = require('../enum/payment_status_enum.js');
const assess_payment_failure = require('./assess_payment_failure.js');
const parking = require('../utilities/parking.js');
const credit_game = require('../purchase/credit_game.js');
const purchase_log = require('../utilities/purchase_log.js');

module.exports = assess_payment_result = async (internal_purchase_id, user_id, payment_result, mark_failed, mark_fraud, mark_unavailable, mark_redirected, mark_pending, mark_completed) => {
    purchase_log(internal_purchase_id, {
        event: 'assess_payment_result',
        details: {
            internal_purchase_id: internal_purchase_id, 
            user_id: user_id, 
            payment_result: payment_result
        }
    });
    switch (payment_result.status) {
        case payment_status_enum.CONFIRMED:
        case payment_status_enum.PAID:
            await mark_completed(internal_purchase_id, payment_result.id);
            // todo we gotta get sale item key in here
            await credit_game(internal_purchase_id, user_id, 'game_id', 'sale_item_key');
            return {
                internal_purchase_id: internal_purchase_id
            };

        case payment_status_enum.FAILED:
            return await assess_payment_failure(internal_purchase_id, user_id, payment_result, mark_failed, mark_fraud, mark_unavailable);
        
        case payment_status_enum.PENDING:
            await mark_pending(internal_purchase_id, payment_result.id);
            const payment_result_from_notification = await new Promise((resolve, reject) => {
                return parking.park_callback(payment_result.id, (error, create_card_result_from_notification) => {
                    if (error) {
                        return reject(error);
                    }
                    return resolve(create_card_result_from_notification);
                });
            });
            return await assess_payment_result(internal_purchase_id, user_id, payment_result_from_notification, mark_failed, mark_fraud, mark_unavailable, mark_redirected, mark_pending, mark_completed);

        case payment_status_enum.ACTION_REQUIRED:
            if (!mark_redirected) {
                return fatal_error({
                    error: 'Function Not Provided: mark_redirected'
                });
            }
            await mark_redirected(internal_purchase_id, payment_result.id);
            return {
                redirect: payment_result.requiredAction.redirectUrl,
                internal_purchase_id: internal_purchase_id
            };
            
        default:
            return fatal_error({
                error: 'Unexpected Payment Status'
            });
    }
};