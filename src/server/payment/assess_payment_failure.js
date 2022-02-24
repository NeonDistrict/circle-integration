const config = require('../../config.js');
const fatal_error = require('../utilities/fatal_error.js');
const user_mark_fraud = require('../postgres/user_mark_fraud.js');
const payment_error_enum = require('../enum/payment_error_enum.js');
const purchase_log = require('../utilities/purchase_log.js');

module.exports = assess_payment_failure = async (internal_purchase_id, user_id, payment_result, mark_failed, mark_fraud, mark_unavailable) => {
    purchase_log(internal_purchase_id, {
        event: 'assess_payment_failure'
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
            // todo: confirm fraud
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
            if (!mark_unavailable) {
                return fatal_error({
                    error: 'Function Not Provided: mark_unavailable'
                });
            }
            await mark_unavailable(internal_purchase_id, payment_result.id);
            return {
                unavailable: 1
            };
        case payment_error_enum.THREE_D_SECURE_ACTION_EXPIRED:
            payment_error = {
                error: '3DSecure Expired'
            };
            break;
        case payment_error_enum.PAYMENT_RETURNED:
            return fatal_error({
                error: 'TODO: NOT SUPPORTED YET'
            });
        case payment_error_enum.CARD_CVV_REQUIRED:
            // note: we always include a cvv
            return fatal_error({
                error: 'Received Impossible Error: CARD_CVV_REQUIRED'
            });
        case payment_error_enum.INVALID_WIRE_RTN:
            // note: we do not use WIRE
            return fatal_error({
                error: 'Received Impossible Error: INVALID_WIRE_RTN'
            });
        case payment_error_enum.INVALID_ACH_RTN:
            // note: we do not use ACH
            return fatal_error({
                error: 'Received Impossible Error: INVALID_ACH_RTN'
            });
        case payment_error_enum.CHANNEL_INVALID:
            // note: we do not use channels
            return fatal_error({
                error: 'Received Impossible Error: CHANNEL_INVALID'
            });
        case payment_error_enum.THREE_D_SECURE_REQUIRED:
            // note: we step down from 3ds -> cvv -> none, receiving this error implies 3ds was skipped or stepped down innapropriately both of which should never happen
            return fatal_error({
                error: 'Received Impossible Error: THREE_D_SECURE_REQUIRED'
            });
        case payment_error_enum.THREE_D_SECURE_INVALID_REQUEST:
            // note: this implies we passed bad redirects or parameters for 3ds, which implies a bad configuration
            return fatal_error({
                error: 'Received Impossible Error: THREE_D_SECURE_INVALID_REQUEST'
            });
        default:
            return fatal_error({
                error: 'Received Unexpected Error: ' + payment_result.errorCode 
            });
    }
    if (payment_error.fraud === 1) {
        await mark_fraud(internal_purchase_id, payment_result.id);
        await user_mark_fraud(user_id);
    } else {
        await mark_failed(internal_purchase_id, payment_result.id);
    }
    throw new Error(payment_error.error);
};