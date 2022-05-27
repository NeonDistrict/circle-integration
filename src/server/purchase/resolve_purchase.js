const log = require('../utilities/log.js');
const call_circle = require('../utilities/call_circle.js');
const payment_3ds_mark_completed = require('../postgres/payment_3ds_mark_completed.js');
const payment_cvv_mark_completed = require('../postgres/payment_cvv_mark_completed.js');
const payment_unsecure_mark_completed = require('../postgres/payment_unsecure_mark_completed.js');
const purchase_mark_failed = require('../postgres/purchase_mark_failed.js');
const purchase_mark_abandoned = require('../postgres/purchase_mark_abandoned.js');
const credit_game = require('./credit_game.js');

module.exports = async (purchase) => {
    log({
        event: 'resolve purchase',
        purchase: purchase
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
                log({
                    event: 'resolve purchase unexpected verification type',
                    verification_type: verification_type
                });
                throw new Error('Internal Server Error');
        }
        await postgres_mark_completed(purchase.internal_purchase_id, payment_id);
        await credit_game(purchase.internal_purchase_id, purchase.user_id, purchase.game_id, purchase.sale_item_key);
        log({
            event: 'resolve purchase marked completed and credited',
            purchase: purchase,
            payment_id: payment_id,
            verification_type: verification_type
        });
        return {
            internal_purchase_id: purchase.internal_purchase_id,
            resolved: 1
        };
    };

    const check_payment_result = async (payment_id, verification_type) => {
        const payment_result = await call_circle(purchase.internal_purchase_id, [200], 'get', `/payments/${payment_id}`, null);
        switch (payment_result.status) {
            case payment_status_enum.CONFIRMED:
            case payment_status_enum.PAID:
                return await payment_completed(payment_id, verification_type);
    
            case payment_status_enum.FAILED:
                // todo: technically we could have a fraud in here, maybe check on that risk assessment
                await purchase_mark_failed(purchase.internal_purchase_id);
                log({
                    event: 'resolve purchase marked failed',
                    purchase: purchase,
                    payment_id: payment_id,
                    verification_type: verification_type
                });
                return {
                    error: 'Purchase Failed',
                    resolved: 1
                };

            case payment_status_enum.PENDING:
            case payment_status_enum.ACTION_REQUIRED:
                // todo if purchases are marked abandoned or failed they cant be resumed
                // todo should cancel payment here, which will require an sns callback nonsense
                await purchase_mark_abandoned(purchase.internal_purchase_id);
                log({
                    event: 'resolve purchase marked abandoned',
                    purchase: purchase,
                    payment_id: payment_id,
                    verification_type: verification_type
                });
                return {
                    error: 'Purchase Abandoned',
                    resolved: 1
                };
                
            default:
                log({
                    event: 'resolve purchase unexpected payment status',
                    purchase: purchase,
                    payment_id: payment_id,
                    verification_type: verification_type,
                    status: payment_result.status
                });
                throw new Error('Internal Server Error');
        }
    };

    // check the overall purchase result
    switch (purchase.purchase_result) {
        case 'PENDING':
            // note: intentionally left blank to move to next check
            break;
        
        case 'FAILED':
            log({
                event: 'resolve purchase was already failed',
                purchase: purchase,
            });
            return {
                error: 'Purchase Failed',
                resolved: 1
            };
        
        case 'FRAUD':
            log({
                event: 'resolve purchase was already fraud',
                purchase: purchase,
            });
            return {
                error: 'Fraud Detected',
                fraud: 1,
                resolved: 1
            };
        
        case 'ABANDONED':
            log({
                event: 'resolve purchase was already abandoned',
                purchase: purchase,
            });
            return {
                error: 'Purchase Abandoned',
                resolved: 1
            };
        
        case 'COMPLETED':
            // note: intentionally left blank to move to the next check to find the payment id and check game credit
            break;
        
        default:
            log({
                event: 'resolve purchase unexpected purchase result',
                purchase: purchase,
                purchase_result: purchase.purchase_result
            });
            throw new Error('Internal Server Error');
    }

    // reaching here implies the purchase is still in the pending state

    // check the create card result
    switch (purchase.create_card_result) {
        case 'NONE':
            await purchase_mark_failed(purchase.internal_purchase_id);
            log({
                event: 'resolve purchase create card result was none',
                purchase: purchase,
                note: 'implies a purchase was created but the create card process was not started, most likely writing the create card start to postgres failed'
            }, true);
            return {
                error: 'Purchase Failed',
                resolved: 1
            };

        case 'REQUESTED':
        case 'PENDING':
            // note: fallthrough is intentional, the card creation never completing implies a payment never started and this purchase has expired
            await purchase_mark_abandoned(purchase.internal_purchase_id)
                log({
                    event: 'resolve purchase create card was requested or pending and marked abandoned',
                    purchase: purchase,
                });
                return {
                    error: 'Purchase Abandoned',
                    resolved: 1
                };

        case 'FAILED':
            log({
                event: 'resolve purchase create card was failed but purchase wasnt',
                purchase: purchase,
                note: 'since the create card result and purchase result is written in a single call only one of them being failed should be impossible'
            }, true);
            throw new Error('Internal Server Error');

        case 'FRAUD':
            log({
                event: 'resolve purchase create card was fraud but purchase wasnt',
                purchase: purchase,
                note: 'since the create card result and purchase result is written in a single call only one of them being fraud should be impossible'
            }, true);
            throw new Error('Internal Server Error');

        case 'COMPLETED':
            // note: intentionally left blank to move to next check
            break;
        
        default:
            log({
                event: 'resolve purchase unexpected create card result',
                purchase: purchase,
                create_card_result: purchase.create_card_result
            });
            throw new Error('Internal Server Error');
    }

    // reaching here implies the card creation completed successfully

    // check the payment 3ds result
    switch (purchase.payment_3ds_result) {
        case 'NONE':
        case 'REQUESTED':
            await purchase_mark_failed(purchase.internal_purchase_id);
            log({
                event: 'resolve purchase payment 3ds result was ' + purchase.payment_3ds_result,
                purchase: purchase,
                note: 'implies a card was created but the payment process was not started successfully'
            }, true);
            return {
                error: 'Purchase Failed',
                resolved: 1
            };


        case 'PENDING':
        case 'REDIRECTED':
        case 'COMPLETED':
            return await check_payment_result(purchase.payment_3ds_id, '3ds');

        case 'FAILED':
            log({
                event: 'resolve purchase payment 3ds was failed but purchase wasnt',
                purchase: purchase,
                note: 'since the payment result and purchase result is written in a single call only one of them being failed should be impossible'
            }, true);
            throw new Error('Internal Server Error');

        case 'FRAUD':
            log({
                event: 'resolve purchase payment 3ds was fraud but purchase wasnt',
                purchase: purchase,
                note: 'since the payment result and purchase result is written in a single call only one of them being fraud should be impossible'
            }, true);
            throw new Error('Internal Server Error');

        case 'UNAVAILABLE':
            // note: intentionally left blank to move to next check
            break;
        
        default:
            log({
                event: 'resolve purchase unexpected payment 3ds result',
                purchase: purchase,
                payment_3ds_result: purchase.payment_3ds_result
            });
            throw new Error('Internal Server Error');
    }
  
    // reaching here implies payment 3ds was unavailable

    // check the payment cvv result
    switch (purchase.payment_cvv_result) {
        case 'NONE':
        case 'REQUESTED':
            await purchase_mark_failed(purchase.internal_purchase_id);
            log({
                event: 'resolve purchase payment cvv result was ' + purchase.payment_cvv_result,
                purchase: purchase,
                note: 'implies a payment 3ds failed but the payment cvv process was not started successfully'
            }, true);
            return {
                error: 'Purchase Failed',
                resolved: 1
            };

        case 'PENDING':
        case 'COMPLETED':
            return await check_payment_result(purchase.payment_cvv_id, 'cvv');
            
        case 'FAILED':
            log({
                event: 'resolve purchase payment cvv was failed but purchase wasnt',
                purchase: purchase,
                note: 'since the payment result and purchase result is written in a single call only one of them being failed should be impossible'
            }, true);
            throw new Error('Internal Server Error');

        case 'FRAUD':
            log({
                event: 'resolve purchase payment cvv was fraud but purchase wasnt',
                purchase: purchase,
                note: 'since the payment result and purchase result is written in a single call only one of them being fraud should be impossible'
            }, true);
            throw new Error('Internal Server Error');

        case 'UNAVAILABLE':
            // note: intentionally left blank to move to next check
            break;
        
        default:
            log({
                event: 'resolve purchase unexpected payment cvv result',
                purchase: purchase,
                payment_cvv_result: purchase.payment_cvv_result
            });
            throw new Error('Internal Server Error');
    }

    // reaching here implies payment cvv was unavailable

    // check the payment none result
    switch (purchase.payment_unsecure_result) {
        case 'NONE':
        case 'REQUESTED':
            await purchase_mark_failed(purchase.internal_purchase_id);
            log({
                event: 'resolve purchase payment unsecure result was none',
                purchase: purchase,
                note: 'implies a payment cvv failed but the payment unsecure process was not started successfully'
            }, true);
            return {
                error: 'Purchase Failed',
                resolved: 1
            };

        case 'PENDING':
        case 'COMPLETED':
            return await check_payment_result(purchase.payment_unsecure_id, 'unsecure');
            
        case 'FAILED':
            log({
                event: 'resolve purchase payment unsecure was failed but purchase wasnt',
                purchase: purchase,
                note: 'since the payment result and purchase result is written in a single call only one of them being failed should be impossible'
            }, true);
            throw new Error('Internal Server Error');

        case 'FRAUD':
            log({
                event: 'resolve purchase payment unsecure was fraud but purchase wasnt',
                purchase: purchase,
                note: 'since the payment result and purchase result is written in a single call only one of them being fraud should be impossible'
            }, true);
            throw new Error('Internal Server Error');
        
        default:
            log({
                event: 'resolve purchase unexpected payment unsecure result',
                purchase: purchase,
                payment_unsecure_result: purchase.payment_unsecure_result
            });
            throw new Error('Internal Server Error');
    }

    log({
        event: 'resolve purchase unexpected state',
        purchase: purchase
    });
    throw new Error('Internal Server Error');
};