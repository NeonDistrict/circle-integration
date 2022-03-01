const log = require('../utilities/log.js');
const create_card_mark_fraud = require('../postgres/create_card_mark_fraud.js');
const create_card_mark_failed = require('../postgres/create_card_mark_failed.js');
const user_mark_fraud = require('../postgres/user_mark_fraud.js');
const create_card_failure_enum = require('../enum/create_card_failure_enum.js');

module.exports = async (internal_purchase_id, user_id, create_card_result) => {
    log({
        event: 'assess create card failure',
        internal_purchase_id: internal_purchase_id,
        user_id: user_id,
        create_card_result: create_card_result
    });
    let create_card_error = null;
    switch (create_card_result.errorCode) {
        case create_card_failure_enum.VERIFICATION_FAILED:
            create_card_error = {
                error: 'Create Card Failed (Unspecified)'
            };
            break;
        case create_card_failure_enum.VERIFICATION_FRAUD_DETECTED:
            create_card_error = {
                error: 'Fraud Detected (Contact Card Provider)',
                fraud: 1
            };
            break;
        case create_card_failure_enum.VERIFICATION_DENIED:
            create_card_error = {
                error: 'Verification Denied (Contact Card Provider)',
                fraud: 1
            };
            break;
        case create_card_failure_enum.VERIFICATION_NOT_SUPPORTED_BY_ISSUER:
            create_card_error = {
                error: 'Verification Not Supported By Issuer'
            };
            break;
        case create_card_failure_enum.VERIFICATION_STOPPED_BY_ISSUER:
            create_card_error = {
                error: 'Verification Stopped (Contact Card Provider)',
                fraud: 1
            };
            break;
        case create_card_failure_enum.CARD_FAILED:
        case create_card_failure_enum.CARD_ADDRESS_MISMATCH:
        case create_card_failure_enum.CARD_ZIP_MISMATCH:
        case create_card_failure_enum.CARD_CVV_INVALID:
        case create_card_failure_enum.CARD_INVALID:
            create_card_error = {
                error: 'Invalid Details (Correct Information)'
            };
            break;
        case create_card_failure_enum.CARD_EXPIRED:
            create_card_error = {
                error: 'Card Expired'
            };
            break;
        case create_card_failure_enum.CARD_LIMIT_VIOLATED:
            create_card_error = {
                error: 'Limit Exceeded (Circle Limit)'
            };
            break;
        case create_card_failure_enum.CARD_NOT_HONORED:
            create_card_error = {
                error: 'Card Not Honored (Contact Card Provider)'
            };
            break;
        case create_card_failure_enum.CREDIT_CARD_NOT_ALLOWED:
            create_card_error = {
                error: 'Card Not Allowed (Contact Card Provider)'
            };
            break;
        case create_card_failure_enum.CARD_ACCOUNT_INELIGIBLE:
            payment_error = {
                error: 'Ineligible Account (Contact Card Provider)'
            };
            break;
        case create_card_failure_enum.CARD_NETWORK_UNSUPPORTED:
            create_card_error = {
                error: 'Card Network Not Supported (Contact Card Provider)'
            };
            break;
        case payment_error_enum.CARD_CVV_REQUIRED:
            log({
                event: 'assess create card failure should not have card cvv required error code',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                create_card_result: create_card_result,
                error_code: create_card_result.errorCode,
                note: 'we always include a cvv it should be impossible to get this error response'
            }, true);
            throw new Error('Internal Server Error');
        default:
            log({
                event: 'assess create card failure unexpected error code',
                internal_purchase_id: internal_purchase_id,
                user_id: user_id,
                create_card_result: create_card_result,
                error_code: create_card_result.errorCode
            }, true);
            throw new Error('Internal Server Error');
    }
    log({
        event: 'assess create card failure result',
        internal_purchase_id: internal_purchase_id,
        user_id: user_id,
        create_card_result: create_card_result,
        error: create_card_error
    });
    if (create_card_error.fraud === 1) {
        await create_card_mark_fraud(internal_purchase_id, create_card_result.id);
        await user_mark_fraud(user_id);
    } else {
        await create_card_mark_failed(internal_purchase_id, create_card_result.id);
    }
    throw new Error(create_card_error.error);
};