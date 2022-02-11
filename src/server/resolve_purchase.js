const config = require('../config.js');
const fatal_error = require('./fatal_error.js');
const notify_dev = require('./notify_dev.js');
const purchase_log = require('./purchase_log');
const call_circle = require('./call_circle.js');

// todo this whole file needs async, ugh still
module.exports = resolve_purchase = async (purchase) => {
    purchase_log(purchase.internal_purchase_id, {
        event: 'assess_existing_purchase_result'
    });

    const check_payment_result = (payment_id, verification_type, cb) => {
        call_circle([200], 'get', `${config.api_uri_base}payments/${payment_id}`, null, (error, payment_result) => {
            if (error) {
                return cb(error);
            }
            switch (payment_result.status) {
                case payment_status_enum.CONFIRMED:
                case payment_status_enum.PAID:
                    let postgres_mark_completed = null;
                    switch (verification_type) {
                        case '3ds':
                            postgres_mark_completed = postgres.payment_3ds_mark_completed
                            break;
                        case 'cvv':
                            postgres_mark_completed = postgres.payment_cvv_mark_completed
                            break;
                        case 'none':
                            postgres_mark_completed = postgres.payment_none_mark_completed
                            break;
                        default:
                            return cb({
                                error: 'Unexpected Verification Type: ' + verification_type
                            });
                    }
                    return postgres_mark_completed(purchase.internal_purchase_id, payment_id, (error) => {
                        if (error) {
                            return cb(error);
                        }
                        // todo crediting game should look at the purchase and determine if should credit etc switch on status
                        return credit_game(config, postgres, purchase.internal_purchase_id, purchase.user_id, purchase.game_id, purchase.sale_item_key, (error) => {
                            if (error) {
                                return cb(error);
                            }
                            return cb(null, {
                                internal_purchase_id: purchase.internal_purchase_id
                            }, true);
                        });
                    });
        
                case payment_status_enum.FAILED:
                    // todo: technically we could have a fraud in here, maybe check on that risk assessment
                    return postgres.purchase_mark_failed(purchase.internal_purchase_id, (error) => {
                        if (error) {
                            return cb(error);
                        }
                        return cb({
                            error: 'Purchase Failed'
                        }, null, true);
                    });

                case payment_status_enum.PENDING:
                case payment_status_enum.ACTION_REQUIRED:
                    // todo should cancel payment here, which will require an sns callback nonsense
                    return postgres.purchase_mark_abandoned(purchase.internal_purchase_id, (error) => {
                        if (error) {
                            return cb(error);
                        }
                        return cb({
                            error: 'Purchase Abandoned'
                        }, null, true);
                    });
                    
                default:
                    return cb({
                        error: 'Unexpected Payment Status'
                    });
            }
        });
    };

    // check the overall purchase result
    switch (purchase.purchase_result) {
        case 'PENDING':
            // note: intentionally left blank to move to next check
            break;
        
        case 'FAILED':
            return cb({
                error: 'Purchase Failed'
            }, null, true);
        
        case 'FRAUD':
            return cb({
                error: 'Fraud Detected',
                fraud: 1
            }, null, true);
        
        case 'ABANDONED':
            return cb({
                error: 'Purchase Abandoned'
            }, null, true);
        
        case 'COMPLETED':
            // note: intentionally left blank to move to the next check to find the payment id and check game credit
            break;
        
        default:
            return fatal_error({
                error: 'Impossible Purchase Result: ' + purchase.purchase_result
            });
    }

    // reaching here implies the purchase is still in the pending state

    // check the create card result
    switch (purchase.create_card_result) {
        case 'NONE':
            // note: implies a purchase was created but the create card process was not started, most likely writing the create card start to postgres failed
            notify_dev({
                issue: 'Resolve purchase had a NONE create card result'
            });
            return postgres.purchase_mark_failed(purchase.internal_purchase_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb({
                    error: 'Purchase Failed'
                }, null, true);
            });

        case 'REQUESTED':
        case 'PENDING':
            // note: fallthrough is intentional, the card creation never completing implies a payment never started and this purchase has expired
            return postgres.purchase_mark_abandoned(purchase.internal_purchase_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb({
                    error: 'Purchase Abandoned'
                }, null, true);
            });

        case 'FAILED':
            // note: the purchase and create card result are marked failed at the same time, this cant happen
            return fatal_error({
                error: 'Purchase was PENDING create card was FAILED'
            });

        case 'FRAUD':
            // note: the purchase and create card result are marked fraud at the same time, this cant happen
            return fatal_error({
                error: 'Purchase was PENDING create card was FRAUD'
            });

        case 'COMPLETED':
            // note: intentionally left blank to move to next check
            break;
        
        default:
            return fatal_error({
                error: 'Impossible Create Card Result: ' + purchase.create_card_result
            });
    }

    // reaching here implies the card creation completed successfully

    // check the payment 3ds result
    switch (purchase.payment_3ds_result) {
        case 'NONE':
            // note: implies a card was created but the payment 3ds process was not started, most likely writing the create payment start to postgres failed
            notify_dev({
                issue: 'Resolve purchase had a NONE create payment 3ds result'
            });
            return postgres.purchase_mark_failed(purchase.internal_purchase_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb({
                    error: 'Purchase Failed'
                }, null, true);
            });

        case 'REQUESTED':
        case 'PENDING':
        case 'REDIRECTED':
        case 'COMPLETED':
            return check_payment_result(purchase.payment_3ds_id, '3ds', cb);

        case 'FAILED':
            // note: the purchase and payment result are marked failed at the same time, this cant happen
            return fatal_error({
                error: 'Purchase was PENDING payment 3ds was FAILED'
            });

        case 'FRAUD':
            // note: the purchase and payment result are marked fraud at the same time, this cant happen
            return fatal_error({
                error: 'Purchase was PENDING payment 3ds was FRAUD'
            });

        case 'UNAVAILABLE':
            // note: intentionally left blank to move to next check
            break;
        
        default:
            return fatal_error({
                error: 'Impossible Payment 3DS Result: ' + purchase.payment_3ds_result
            });
    }
  
    // reaching here implies payment 3ds was unavailable

    // check the payment cvv result
    switch (purchase.payment_cvv_result) {
        case 'NONE':
            // note: implies the payment 3ds was not available but payment cvv was not started, most likely writing the create payment start to postgres failed
            notify_dev({
                issue: 'Resolve purchase had a NONE create payment cvv result'
            });
            return postgres.purchase_mark_failed(purchase.internal_purchase_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb({
                    error: 'Purchase Failed'
                }, null, true);
            });

        case 'REQUESTED':
        case 'PENDING':
        case 'COMPLETED':
            return check_payment_result(purchase.payment_3ds_id, 'cvv', cb);
            
        case 'FAILED':
            // note: the purchase and payment result are marked failed at the same time, this cant happen
            return fatal_error({
                error: 'Purchase was PENDING payment cvv was FAILED'
            });

        case 'FRAUD':
            // note: the purchase and payment result are marked fraud at the same time, this cant happen
            return fatal_error({
                error: 'Purchase was PENDING payment cvv was FRAUD'
            });

        case 'UNAVAILABLE':
            // note: intentionally left blank to move to next check
            break;
        
        default:
            return fatal_error({
                error: 'Impossible Payment CVV Result: ' + purchase.payment_cvv_result
            });
    }

    // reaching here implies payment cvv was unavailable

    // check the payment none result
    switch (purchase.payment_none_result) {
        case 'NONE':
            // note: implies the payment cvv was not available but payment none was not started, most likely writing the create payment start to postgres failed
            notify_dev({
                issue: 'Resolve purchase had a NONE create payment none result'
            });
            return postgres.purchase_mark_failed(purchase.internal_purchase_id, 'none', (error) => {
                if (error) {
                    return cb(error);
                }
                return cb({
                    error: 'Purchase Failed'
                }, null, true);
            });

        case 'REQUESTED':
        case 'PENDING':
        case 'COMPLETED':
            return check_payment_result(purchase.payment_3ds_id, cb);
            
        case 'FAILED':
            // note: the purchase and payment result are marked failed at the same time, this cant happen
            return fatal_error({
                error: 'Purchase was PENDING payment cvv was FAILED'
            });

        case 'FRAUD':
            // note: the purchase and payment result are marked fraud at the same time, this cant happen
            return fatal_error({
                error: 'Purchase was PENDING payment cvv was FRAUD'
            });
        
        default:
            return fatal_error({
                error: 'Impossible Payment None Result: ' + purchase.payment_none_result
            });
    }

    return fatal_error({
        error: 'Unreached State in resolve_purchase'
    });
};