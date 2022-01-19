const payment_error_enum = require('./enum/payment_error_enum.js');

module.exports = assess_payment_failure = (payment_result) => {
    switch (payment_result.errorCode) {
        case payment_error_enum.PAYMENT_FAILED:
        case payment_error_enum.VERIFICATION_FAILED:
            return {
                error: 'Payment Failed (Unspecified)'
            };
        case payment_error_enum.PAYMENT_FRAUD_DETECTED:
        case payment_error_enum.VERIFICATION_FRAUD_DETECTED:
            return {
                error: 'Fraud Detected (Contact Card Provider)'
            };
        case payment_error_enum.PAYMENT_DENIED:
        case payment_error_enum.RISK_DENIED:
        case payment_error_enum.VERIFICATION_NOT_SUPPORTED_BY_ISSUER:
        case payment_error_enum.THREE_D_SECURE_FAILURE:
            return {
                error: 'Payment Denied (Contact Card Provider)'
            };
        case payment_error_enum.PAYMENT_NOT_SUPPORTED_BY_ISSUER:
        case payment_error_enum.CARD_NETWORK_UNSUPPORTED:
            return {
                error: 'Payment Not Supported (Contact Card Provider)'
            };
        case payment_error_enum.PAYMENT_NOT_FUNDED:
            return {
                error: 'Insufficient Funds (Contact Card Provider)'
            };
        case payment_error_enum.PAYMENT_STOPPED_BY_ISSUER:
        case payment_error_enum.VERIFICATION_STOPPED_BY_ISSUER:
            return {
                error: 'Payment Stopped (Contact Card Provider)'
            };
        case payment_error_enum.UNAUTHORIZED_TRANSACTION:
            return {
                error: 'Payment Unauthorized (Contact Card Provider)'
            };
        case payment_error_enum.CARD_INVALID:
        case payment_error_enum.INVALID_ACCOUNT_NUMBER:
        case payment_error_enum.CARD_CVV_INVALID:
        case payment_error_enum.CARD_ADDRESS_MISMATCH:
        case payment_error_enum.CARD_ZIP_MISMATCH:
        case payment_error_enum.CARD_CVV_REQUIRED:
        case payment_error_enum.CARD_FAILED:
            return {
                error: 'Invalid Details (Correct Information)'
            };
        case payment_error_enum.CARD_EXPIRED:
            return {
                error: 'Card Expired'
            };
        case payment_error_enum.CARD_LIMIT_VIOLATED:
            return {
                error: 'Limit Exceeded (Circle Limit)'
            };
        case payment_error_enum.CARD_NOT_HONORED:
            return {
                error: 'Card Not Honored (Contact Card Provider)'
            };
        case payment_error_enum.CREDIT_CARD_NOT_ALLOWED:
            return {
                error: 'Card Not Allowed (Contact Card Provider)'
            };
        case payment_error_enum.CARD_ACCOUNT_INELIGIBLE:
        case payment_error_enum.BANK_ACCOUNT_INELIGIBLE:
            return {
                error: 'Ineligible Account (Contact Card Provider)'
            };
        case payment_error_enum.PAYMENT_FAILED_BALANCE_CHECK:
            return {
                error: 'Insufficient Balance (Contact Card Provider)'
            };
        case payment_error_enum.BANK_TRANSACTION_ERROR:
            return {
                error: 'Bank Transaction Error (Contact Card Provider)'
            };
        case payment_error_enum.PAYMENT_CANCELED:
            return {
                error: 'Payment Cancelled'
            };
        case payment_error_enum.PAYMENT_UNPROCESSABLE:
            return {
                error: 'Public Key Failure'
            };
        case payment_error_enum.THREE_D_SECURE_NOT_SUPPORTED:
            return {
                error: '3DSecure Not Supported'
            };
        case payment_error_enum.THREE_D_SECURE_ACTION_EXPIRED:
            return {
                error: '3DSecure Expired'
            };
        case payment_error_enum.PAYMENT_RETURNED:               // todo: this is a different case entirely, how to handle this?
        case payment_error_enum.INVALID_WIRE_RTN:               // note: we do not do wires
        case payment_error_enum.INVALID_ACH_RTN:                // note: we do not do ach payments
        case payment_error_enum.CHANNEL_INVALID:                // note: we do not use the channels function of circle
        case payment_error_enum.THREE_D_SECURE_REQUIRED:        // note: we start with 3dsecure then step down to cvv if not available. if this error occurs someone is doing something they shouldnt
        case payment_error_enum.THREE_D_SECURE_INVALID_REQUEST: // note: this means we sent bad params, which should never happen. if this error occurs someone is doing something they shouldnt
        default:
            // todo these cant happen, a dev should be notified
            return {
                error: 'Server Error'
            };
    }
};