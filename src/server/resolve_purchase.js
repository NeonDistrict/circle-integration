const config = require('../config.js');
const fatal_error = require('./fatal_error.js');
const notify_dev = require('./notify_dev.js');
const purchase_log = require('./purchase_log');
const call_circle = require('./call_circle.js');

const payment_3ds_mark_completed = require('./postgres/payment_3ds_mark_completed.js');
const payment_cvv_mark_completed = require('./postgres/payment_cvv_mark_completed.js');
const payment_unsecure_mark_completed = require('./postgres/payment_unsecure_mark_completed.js');
const purchase_mark_failed = require('./postgres/purchase_mark_failed.js');
const purchase_mark_abandoned = require('./postgres/purchase_mark_abandoned.js');

// todo this whole file needs async, ugh still
module.exports = resolve_purchase = async (purchase) => {
    purchase_log(purchase.internal_purchase_id, {
        event: 'resolve_purchase',
        details: {
            purchase: purchase
        }
    });

    const payment_completed = async (payment_id, verification_type) => {
        let postgres_mark_completed = null;
        switch (verification_type) {
            case '3ds':
                postgres_mark_completed = payment_3ds_mark_completed
                break;
            case 'cvv':
                postgres_mark_completed = payment_cvv_mark_completed
                break;
            case 'none':
                postgres_mark_completed = payment_unsecure_mark_completed
                break;
            default:
                throw new Error('Unexpected Verification Type: ' + verification_type)
        }
        await postgres_mark_completed(purchase.internal_purchase_id, payment_id);

        // todo crediting game should look at the purchase and determine if should credit etc switch on status
        await credit_game(config, postgres, purchase.internal_purchase_id, purchase.user_id, purchase.game_id, purchase.sale_item_key);
        return {
            internal_purchase_id: purchase.internal_purchase_id,
            resolved: 1
        };
    };

    const check_payment_result = async (payment_id, verification_type) => {
        const payment_result = await call_circle([200], 'get', `/payments/${payment_id}`, null);
        switch (payment_result.status) {
            case payment_status_enum.CONFIRMED:
            case payment_status_enum.PAID:
                return await payment_completed(payment_id, verification_type);
    
            case payment_status_enum.FAILED:
                // todo: technically we could have a fraud in here, maybe check on that risk assessment
                await purchase_mark_failed(purchase.internal_purchase_id);
                return {
                    error: 'Purchase Failed',
                    resolved: 1
                };

            case payment_status_enum.PENDING:
            case payment_status_enum.ACTION_REQUIRED:
                // todo if purchases are marked abandoned or failed they cant be resumed
                // todo should cancel payment here, which will require an sns callback nonsense
                await purchase_mark_abandoned(purchase.internal_purchase_id);
                return {
                    error: 'Purchase Abandoned',
                    resolved: 1
                };
                
            default:
                return fatal_error({
                    error: 'Unexpected Payment Status'
                });
        }
    };

    // check the overall purchase result
    switch (purchase.purchase_result) {
        case 'PENDING':
            // note: intentionally left blank to move to next check
            break;
        
        case 'FAILED':
            return {
                error: 'Purchase Failed',
                resolved: 1
            };
        
        case 'FRAUD':
            return {
                error: 'Fraud Detected',
                fraud: 1,
                resolved: 1
            };
        
        case 'ABANDONED':
            return {
                error: 'Purchase Abandoned',
                resolved: 1
            };
        
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
            await purchase_mark_failed(purchase.internal_purchase_id);
            return {
                error: 'Purchase Failed',
                resolved: 1
            };

        case 'REQUESTED':
        case 'PENDING':
            // note: fallthrough is intentional, the card creation never completing implies a payment never started and this purchase has expired
            await purchase_mark_abandoned(purchase.internal_purchase_id)
            case 'ABANDONED':
                return {
                    error: 'Purchase Abandoned',
                    resolved: 1
                };

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
            await purchase_mark_failed(purchase.internal_purchase_id);
            return {
                error: 'Purchase Failed',
                resolved: 1
            };

        case 'REQUESTED':
        case 'PENDING':
        case 'REDIRECTED':
        case 'COMPLETED':
            return await check_payment_result(purchase.payment_3ds_id, '3ds');

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
            await purchase_mark_failed(purchase.internal_purchase_id);
            return {
                error: 'Purchase Failed',
                resolved: 1
            };

        case 'REQUESTED':
        case 'PENDING':
        case 'COMPLETED':
            return await check_payment_result(purchase.payment_3ds_id, 'cvv');
            
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
            await purchase_mark_failed(purchase.internal_purchase_id);
            return {
                error: 'Purchase Failed',
                resolved: 1
            };

        case 'REQUESTED':
        case 'PENDING':
        case 'COMPLETED':
            return await check_payment_result(purchase.payment_3ds_id);
            
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
        error: 'Unreachable State in resolve_purchase'
    });
};