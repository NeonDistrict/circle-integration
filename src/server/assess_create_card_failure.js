const fatal_error = require('./fatal_error.js');
const create_card_error_enum = require('./enum/create_card_error_enum.js');
const purchase_log = require('./purchase_log.js');

module.exports = assess_create_card_failure = (config, postgres, internal_purchase_id, user_id, create_card_result, cb) => {
    purchase_log(internal_purchase_id, {
        event: 'assess_payment_failure'
    });
    
    let create_card_error = null;
    switch (create_card_result.errorCode) {
        case create_card_error_enum.VERIFICATION_FAILED:
            create_card_error = {
                error: 'Create Card Failed (Unspecified)'
            };
            break;
        case create_card_error_enum.VERIFICATION_FRAUD_DETECTED:
            create_card_error = {
                error: 'Fraud Detected (Contact Card Provider)',
                fraud: 1
            };
            break;
        case create_card_error_enum.VERIFICATION_DENIED:
            create_card_error = {
                error: 'Verification Denied (Contact Card Provider)',
                fraud: 1
            };
            break;
        case create_card_error_enum.VERIFICATION_NOT_SUPPORTED_BY_ISSUER:
            create_card_error = {
                error: 'Verification Not Supported By Issuer'
            };
            break;
        case create_card_error_enum.VERIFICATION_STOPPED_BY_ISSUER:
            create_card_error = {
                error: 'Verification Stopped (Contact Card Provider)',
                fraud: 1
            };
            break;
        case create_card_error_enum.CARD_FAILED:
        case create_card_error_enum.CARD_ADDRESS_MISMATCH:
        case create_card_error_enum.CARD_ZIP_MISMATCH:
        case create_card_error_enum.CARD_CVV_INVALID:
        case create_card_error_enum.CARD_INVALID:
            create_card_error = {
                error: 'Invalid Details (Correct Information)'
            };
            break;
        case create_card_error_enum.CARD_EXPIRED:
            create_card_error = {
                error: 'Card Expired'
            };
            break;
        case create_card_error_enum.CARD_LIMIT_VIOLATED:
            create_card_error = {
                error: 'Limit Exceeded (Circle Limit)'
            };
            break;
        case create_card_error_enum.CARD_NOT_HONORED:
            create_card_error = {
                error: 'Card Not Honored (Contact Card Provider)'
            };
            break;
        case create_card_error_enum.CREDIT_CARD_NOT_ALLOWED:
            create_card_error = {
                error: 'Card Not Allowed (Contact Card Provider)'
            };
            break;
        case create_card_error_enum.CARD_ACCOUNT_INELIGIBLE:
            payment_error = {
                error: 'Ineligible Account (Contact Card Provider)'
            };
            break;
        case create_card_error_enum.CARD_NETWORK_UNSUPPORTED:
            create_card_error = {
                error: 'Card Network Not Supported (Contact Card Provider)'
            };
            break;
        case payment_error_enum.CARD_CVV_REQUIRED:
            // note: we always include a cvv
            return fatal_error({
                error: 'Received Impossible Error: CARD_CVV_REQUIRED'
            });
        default:
            return fatal_error({
                error: 'Received Unexpected Error: ' + create_card_result.errorCode 
            });
    }
    if (create_card_error.fraud === 1) {
        return postgres.create_card_mark_fraud(internal_purchase_id, create_card_result.id, (error) => {
            if (error) {
                return cb(error);
            }
            return postgres.user_mark_fraud(user_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb(create_card_error);
            });
        });
    }
    return postgres.create_card_mark_failed(internal_purchase_id, create_card_result.id, (error) => {
        if (error) {
            return cb(error);
        }
        return cb(create_card_error);
    });
};