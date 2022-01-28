const fatal_error = require('./fatal_error.js');
const payment_error_enum = require('./enum/payment_error_enum.js');
const assess_payment_risk = require('./assess_payment_risk.js');

module.exports = assess_payment_failure = (config, postgres, user, internal_purchase_id, payment_result, mark_failed, mark_fraud, mark_unavailable, cb) => {
    // todo does risk come back as failed? or some other result?
    // this could go into the switch then
    // todo do we even need this is we have the below?
    /*
    const risk_error = assess_payment_risk(payment_result);
    if (risk_error) {
        return cb(risk_error);
    }
    */

    let error = null;
    switch (payment_result.errorCode) {
        case payment_error_enum.PAYMENT_FAILED:
        case payment_error_enum.VERIFICATION_FAILED:
            error = {
                error: 'Payment Failed (Unspecified)'
            };
            break;
        case payment_error_enum.PAYMENT_FRAUD_DETECTED:
        case payment_error_enum.VERIFICATION_FRAUD_DETECTED:
            error = {
                error: 'Fraud Detected (Contact Card Provider)',
                fraud: 1
            };
            break;
        case payment_error_enum.PAYMENT_DENIED:
            // todo i think this is just failure but might be fraud
            error = {
                error: 'Payment Denied (Contact Card Provider)'
            };
            break;
        case payment_error_enum.RISK_DENIED:
            // todo confirm fraud
            error = {
                error: 'Risk Denied (Contact Card Provider)',
                fraud: 1
            };
            break;
        case payment_error_enum.VERIFICATION_NOT_SUPPORTED_BY_ISSUER:
            // todo: is this unavailable?
            error = {
                error: 'Verification Not Supported By Issuer'
            };
            break;
        case payment_error_enum.THREE_D_SECURE_FAILURE:
            error = {
                error: '3DSecure Verficiation Failed'
            };
            break;
        case payment_error_enum.PAYMENT_NOT_SUPPORTED_BY_ISSUER:
        case payment_error_enum.CARD_NETWORK_UNSUPPORTED:
            error = {
                error: 'Payment Not Supported (Contact Card Provider)'
            };
            break;
        case payment_error_enum.PAYMENT_NOT_FUNDED:
            error = {
                error: 'Insufficient Funds (Contact Card Provider)'
            };
            break;
        case payment_error_enum.PAYMENT_STOPPED_BY_ISSUER:
        case payment_error_enum.VERIFICATION_STOPPED_BY_ISSUER:
            error = {
                error: 'Payment Stopped (Contact Card Provider)',
                fraud: 1
            };
            break;
        case payment_error_enum.UNAUTHORIZED_TRANSACTION:
            // todo: confirm fraud
            error = {
                error: 'Payment Unauthorized (Contact Card Provider)',
                fraud: 1
            };
            break;
        case payment_error_enum.CARD_INVALID:
        case payment_error_enum.INVALID_ACCOUNT_NUMBER:
        case payment_error_enum.CARD_CVV_INVALID:
        case payment_error_enum.CARD_ADDRESS_MISMATCH:
        case payment_error_enum.CARD_ZIP_MISMATCH:
        case payment_error_enum.CARD_CVV_REQUIRED:
        case payment_error_enum.CARD_FAILED:
            error = {
                error: 'Invalid Details (Correct Information)'
            };
            break;
        case payment_error_enum.CARD_EXPIRED:
            error = {
                error: 'Card Expired'
            };
            break;
        case payment_error_enum.CARD_LIMIT_VIOLATED:
            error = {
                error: 'Limit Exceeded (Circle Limit)'
            };
            break;
        case payment_error_enum.CARD_NOT_HONORED:
            error = {
                error: 'Card Not Honored (Contact Card Provider)'
            };
            break;
        case payment_error_enum.CREDIT_CARD_NOT_ALLOWED:
            error = {
                error: 'Card Not Allowed (Contact Card Provider)'
            };
            break;
        case payment_error_enum.CARD_ACCOUNT_INELIGIBLE:
        case payment_error_enum.BANK_ACCOUNT_INELIGIBLE:
            error = {
                error: 'Ineligible Account (Contact Card Provider)'
            };
            break;
        case payment_error_enum.PAYMENT_FAILED_BALANCE_CHECK:
            error = {
                error: 'Insufficient Balance (Contact Card Provider)'
            };
            break;
        case payment_error_enum.BANK_TRANSACTION_ERROR:
            error = {
                error: 'Bank Transaction Error (Contact Card Provider)'
            };
            break;
        case payment_error_enum.PAYMENT_CANCELED:
            error = {
                error: 'Payment Cancelled'
            };
            break;
        case payment_error_enum.PAYMENT_UNPROCESSABLE:
            config.cached_circle_key = null;
            error = {
                error: 'Circle Key Failure'
            };
            break;
        case payment_error_enum.THREE_D_SECURE_NOT_SUPPORTED:
            if (!mark_unavailable) {
                return fatal_error({
                    error: 'Function Not Provided: mark_unavailable'
                });
            }
            return mark_unavailable(internal_purchase_id, payment_result.id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb(null, {
                    unavailable: 1
                });
            });
        case payment_error_enum.THREE_D_SECURE_ACTION_EXPIRED:
            error = {
                error: '3DSecure Expired'
            };
            break;
        case payment_error_enum.PAYMENT_RETURNED:
            return fatal_error({
                error: 'TODO: NOT SUPPORTED YET'
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
    if (failure_error) {
        return mark_failed(internal_purchase_id, payment_result.id, (error) => {
            if (error) {
                return cb(error);
            }
            return cb(failure_error);
        });
    }
    if (fraud_error) {
        return mark_fraud(internal_purchase_id, payment_result.id, (error) => {
            if (error) {
                return cb(error);
            }
            return postgres.user_mark_fraud(user.user_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb(fraud_error);
            });
        });
    }
    return fatal_error({
        error: 'Unexpected Result Assess Payment Failure'
    });
};