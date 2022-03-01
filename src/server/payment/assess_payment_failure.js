const log = require('../utilities/log.js');
const config = require('../../config.js');
const user_mark_fraud = require('../postgres/user_mark_fraud.js');
const payment_error_enum = require('../enum/payment_error_enum.js');

module.exports = async (internal_purchase_id, user_id, payment_result, mark_failed, mark_fraud, mark_unavailable) => {
    log({
        event: 'assess payment failure',
        internal_purchase_id: internal_purchase_id,
        user_id: user_id,
        payment_result: payment_result
    });
    let payment_error = null;
    switch (payment_result.errorCode) {
        case payment_error_enum.PAYMENT_FAILED:
        case payment_error_enum.VERIFICATION_FAILED:
            payment_error = {
                error: 'Payment Failed (Unspecified)'
            };
            break;
        case payment_error_enum.PAYMENT_FRAUD_DETECTED:
        case payment_error_enum.VERIFICATION_FRAUD_DETECTED:
            payment_error = {
                error: 'Fraud Detected (Contact Card Provider)',
                fraud: 1
            };
            break;
        case payment_error_enum.PAYMENT_DENIED:
            payment_error = {
                error: 'Payment Denied (Contact Card Provider)'
            };
            break;
        case payment_error_enum.RISK_DENIED:
            payment_error = {
                error: 'Risk Denied (Contact Card Provider)',
                fraud: 1
            };
            break;
        case payment_error_enum.THREE_D_SECURE_FAILURE:
            payment_error = {
                error: '3DSecure Verficiation Failed'
            };
            break;
        case payment_error_enum.PAYMENT_NOT_SUPPORTED_BY_ISSUER:
        case payment_error_enum.CARD_NETWORK_UNSUPPORTED:
            payment_error = {
                error: 'Payment Not Supported (Contact Card Provider)'
            };
            break;
        case payment_error_enum.PAYMENT_NOT_FUNDED:
            payment_error = {
                error: 'Insufficient Funds (Contact Card Provider)'
            };
            break;
        case payment_error_enum.PAYMENT_STOPPED_BY_ISSUER:
        case payment_error_enum.VERIFICATION_STOPPED_BY_ISSUER:
            payment_error = {
                error: 'Payment Stopped (Contact Card Provider)',
                fraud: 1
            };
            break;
        case payment_error_enum.UNAUTHORIZED_TRANSACTION:
            payment_error = {
                error: 'Payment Unauthorized (Contact Card Provider)',
                fraud: 1
            };
            break;
        case payment_error_enum.CARD_INVALID:
        case payment_error_enum.INVALID_ACCOUNT_NUMBER:
        case payment_error_enum.CARD_CVV_INVALID:
        case payment_error_enum.CARD_ADDRESS_MISMATCH:
        case payment_error_enum.CARD_ZIP_MISMATCH:
        case payment_error_enum.CARD_FAILED:
            payment_error = {
                error: 'Invalid Details (Correct Information)'
            };
            break;
        case payment_error_enum.CARD_EXPIRED:
            payment_error = {
                error: 'Card Expired'
            };
            break;
        case payment_error_enum.CARD_LIMIT_VIOLATED:
            payment_error = {
                error: 'Limit Exceeded (Circle Limit)'
            };
            break;
        case payment_error_enum.CARD_NOT_HONORED:
            payment_error = {
                error: 'Card Not Honored (Contact Card Provider)'
            };
            break;
        case payment_error_enum.CREDIT_CARD_NOT_ALLOWED:
            payment_error = {
                error: 'Card Not Allowed (Contact Card Provider)'
            };
            break;
        case payment_error_enum.CARD_ACCOUNT_INELIGIBLE:
        case payment_error_enum.BANK_ACCOUNT_INELIGIBLE:
            payment_error = {
                error: 'Ineligible Account (Contact Card Provider)'
            };
            break;
        case payment_error_enum.PAYMENT_FAILED_BALANCE_CHECK:
            payment_error = {
                error: 'Insufficient Balance (Contact Card Provider)'
            };
            break;
        case payment_error_enum.BANK_TRANSACTION_ERROR:
            payment_error = {
                error: 'Bank Transaction Error (Contact Card Provider)'
            };
            break;
        case payment_error_enum.PAYMENT_CANCELED:
            payment_error = {
                error: 'Payment Cancelled'
            };
            break;
        case payment_error_enum.PAYMENT_UNPROCESSABLE:
            config.cached_circle_key = null;
            payment_error = {
                error: 'Circle Key Failure'
            };
            break;
        case payment_error_enum.THREE_D_SECURE_NOT_SUPPORTED:
        case payment_error_enum.VERIFICATION_NOT_SUPPORTED_BY_ISSUER:
            if (mark_unavailable === null) {
                log({
                    event: 'assess payment failure payment required unavailable but mark_unavailable was not provided',
                    internal_purchase_id: internal_purchase_id,
                    user_id: user_id,
                    payment_result: payment_result,
                    note: 'only 3ds and cvv payments can be an unavailable type for accounts, this implies unsecure returned unavailable after trying both 3ds and cvv, which should never happen'
                }, true);
                throw new Error('Internal Server Error');
            }
            await mark_unavailable(internal_purchase_id, payment_result.id);
            log({
                event: 'assess payment failure 3ds or cvv not available',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                payment_result: payment_result
            });
            return {
                unavailable: 1
            };
        case payment_error_enum.THREE_D_SECURE_ACTION_EXPIRED:
            payment_error = {
                error: '3DSecure Expired'
            };
            break;
        case payment_error_enum.PAYMENT_RETURNED:
            log({
                event: 'assess payment failure should not have payment returned error code',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                payment_result: payment_result,
                error_code: payment_result.errorCode,
                note: 'cant think of any situation where a payment resolution would come to this state'
            }, true);
            throw new Error('Internal Server Error');
        case payment_error_enum.CARD_CVV_REQUIRED:
            log({
                event: 'assess payment failure should not have card cvv required error code',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                payment_result: payment_result,
                error_code: payment_result.errorCode,
                note: 'we always include a cvv it should be impossible to get this error response'
            }, true);
            throw new Error('Internal Server Error');
        case payment_error_enum.INVALID_WIRE_RTN:
            log({
                event: 'assess payment failure should not have invalid wire rtn error code',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                payment_result: payment_result,
                error_code: payment_result.errorCode,
                note: 'we dont support wire'
            }, true);
            throw new Error('Internal Server Error');
        case payment_error_enum.INVALID_ACH_RTN:
            log({
                event: 'assess payment failure should not have invalid ach rtn error code',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                payment_result: payment_result,
                error_code: payment_result.errorCode,
                note: 'we dont support ach'
            }, true);
            throw new Error('Internal Server Error');
        case payment_error_enum.CHANNEL_INVALID:
            log({
                event: 'assess payment failure should not have channel invalid error code',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                payment_result: payment_result,
                error_code: payment_result.errorCode,
                note: 'we dont use circle channels'
            }, true);
            throw new Error('Internal Server Error');
        case payment_error_enum.THREE_D_SECURE_REQUIRED:
            log({
                event: 'assess payment failure should not have three d secure required error code',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                payment_result: payment_result,
                error_code: payment_result.errorCode,
                note: 'we step from from 3ds to cvv to unsecure, receiving this error implies 3ds was skipped or stepped down innapropriately both of which should never happen'
            }, true);
            throw new Error('Internal Server Error');
        case payment_error_enum.THREE_D_SECURE_INVALID_REQUEST:
            log({
                event: 'assess payment failure should not have three d secure invalid request error code',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                payment_result: payment_result,
                error_code: payment_result.errorCode,
                note: 'this implies either a redirect was invalid (they dont allow localhost but i think 127.0.0.1 is fine) or some other parameter for 3ds that is set in config was invalid'
            }, true);
            throw new Error('Internal Server Error');
        default:
            log({
                event: 'assess payment failure unexpected error code',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                payment_result: payment_result,
                error_code: payment_result.errorCode
            }, true);
            throw new Error('Internal Server Error');
    }
    log({
        event: 'assess payment failure result',
        internal_purchase_id: internal_purchase_id,
        user_id: user_id,
        payment_result: payment_result,
        error: payment_error
    });
    if (payment_error.fraud === 1) {
        await mark_fraud(internal_purchase_id, payment_result.id);
        await user_mark_fraud(user_id);
    } else {
        await mark_failed(internal_purchase_id, payment_result.id);
    }
    throw new Error(payment_error.error);
};