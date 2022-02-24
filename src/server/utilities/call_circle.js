const config = require('../../config.js');
const api_error_enum = require('../enum/api_error_enum.js');
const axios = require('axios');

module.exports = call_circle = async (internal_purchase_id, accepted_response_codes, method, endpoint, data) => {
    const request = {
        method: method,
        url: `${config.api_uri_base}${endpoint}`,
        headers: {
            'Authorization': `Bearer ${config.api_sandbox_key}`
        }
    };
    if (data !== null) {
        request.data = data;
    }

    purchase_log(internal_purchase_id, {
        event: 'call_circle_request',
        details: {
            request: request
        }
    });

    let response;
    try {
        response = await axios(request);
    } catch (request_error) {
        // axios wont return the response normally on error codes, associate it here
        response = request_error.response;
    }

    // get status code
    const status_code = response.status || (response.data.hasOwnProperty('code') ? response.data.code : 999);

    purchase_log(internal_purchase_id, {
        event: 'call_circle_response',
        details: {
            response: response.data,
            status_code: status_code
        }
    });

    // if our request has an accepted response code
    if (accepted_response_codes.includes(status_code)) {

        // if the body is malformed, return a malformed error
        if (!response.data.hasOwnProperty('data')) {
            throw new Error('Malformed Circle Response');
        }

        // get the response body from the response
        const response_body = response.data.data;

        // return just the response body
        return response_body;
    }

    // reaching here implies we had a bad response, attempt to identify why

    // check if there is a known api error code
    if (response.data.hasOwnProperty('code')) {
        switch (response.data.code) {
            case api_error_enum.UNKNOWN_ERROR:
            case api_error_enum.MALFORMED_AUTHORIZATION:     
            case api_error_enum.FORBIDDEN:   
            case api_error_enum.MECHANT_ACCOUNT_NOT_ASSOCIATED:        
            case api_error_enum.WALLET_ACCOUNT_NOT_FOUND:        
            case api_error_enum.MARKETPLACE_INFO_REQUIRED:  
            case api_error_enum.PAYMENT_AMOUNT_INVALID:        
            case api_error_enum.CURRENCY_NOT_SUPPORTED:
            case api_error_enum.INVALID_SOURCE_ACCOUNT:        
            case api_error_enum.SOURCE_ACCOUNT_NOT_FOUND:        
            case api_error_enum.INVALID_WIRE_ROUTING_NUMBER:        
            case api_error_enum.INVALID_WIRE_IBAN:        
            case api_error_enum.SOURCE_ACCOUNT_INSUFFICIENT_FUNDS:    
            case api_error_enum.WIRE_PAYMENT_AMOUNT_FAILED:        
            case api_error_enum.MERCHANT_WALLET_ID_MISSING:        
            case api_error_enum.INVALID_FIAT_ACCOUNT_TYPE:    
            case api_error_enum.IBAN_COUNTRY_MISMATCH:        
            case api_error_enum.IBAN_REQUIRED: 
            case api_error_enum.RECIPIENT_ADDRESS_ALREADY_EXISTS:        
            case api_error_enum.ADDRESS_NOT_VERIFIED_FOR_WITHDRAWAL:        
            case api_error_enum.ADDRESS_ON_UNSUPPORTED_BLOCKCHAIN:        
            case api_error_enum.WALLET_TYPE_NOT_SUPPORTED:        
            case api_error_enum.UNSUPPORTED_TRANSFER:   
            case api_error_enum.PAYOUT_LIMIT_EXCEEDED:
                // note: none of these should happen, and report as a server error, only the logs will contain details since they may be malicious
                // todo any internal server errors should report
                throw new Error('Internal Server Error');
            case api_error_enum.ACCOUNT_NUMBER_INVALID:
            case api_error_enum.LAST_NAME_REQUIRED:     
            case api_error_enum.INVALID_COUNTRY_FORMAT:
            case api_error_enum.INVALID_DISTRICT_FORMAT:       
            case api_error_enum.INVALID_BIN_RANGE:        
            case api_error_enum.INVALID_CARD_NUMBER:  
            case api_error_enum.ADDITIONAL_BANK_DETAILS_REQUIRED:        
            case api_error_enum.ADDITIONAL_BILLING_DETAILS_REQUIRED:   
                // note: some of these may be wire or transfer only, but we report them all with the generic invalid details anyways
                throw new Error('Invalid Details (Correct Information)');
            case api_error_enum.INVALID_ENTITY:
                // note: invalid entity comes back for public key failure or just bad fields, but we only get this message for bad pk
                if (response.data.hasOwnProperty('message') && response.data.message === 'Request body contains unprocessable entity.') {
                    throw new Error('Public Key Failure');
                } else {
                    throw new Error('Invalid Details (Correct Information)');
                }
            case api_error_enum.PUBLIC_KEY_ID_NOT_FOUND:
                throw new Error('Public Key Failure');
            case api_error_enum.IDEMPOTENCY_KEY_ALREADY_USED: 
                throw new Error('Idempotency Key Already Used');
            case api_error_enum.PAYMENT_NOT_FOUND:        
                throw new Error('Payment Not Found');
            case api_error_enum.PAYMENT_EXCEEDS_MERCHANT_LIMIT:
                // note: this could be that a payment is too small, too large, or beyond a daily/weekly/monthly limit
                throw new Error('Payment Exceeds Merchant Limit');
            case api_error_enum.CANNOT_BE_CANCELLED:  
                throw new Error('Cannot Cancel');
            case api_error_enum.CANNOT_BE_REFUNDED:
                throw new Error('Cannot Refund');
            case api_error_enum.ALREADY_CANCELLED:
                throw new Error('Already Canceled');
            case api_error_enum.REFUND_EXCEEDS_PAYMENT:
                throw new Error('Refund Exceeds Payment');
            case api_error_enum.ORIGINAL_PAYMENT_FAILED:        
                // note: this happens when we try to refund or cancel a payment that was originally failed, and cannot be refunded or cancelled
                throw new Error('Original Payment Was Failed');
            case api_error_enum.UNSUPPORTED_COUNTRY:        
                throw new Error('Unsupported Country');
            default:
                // unknown code, continue to http response codes
                break;
        }
    }

    // define failure codes
    // todo some of these should informa  dev if not all of them?
    const failure_codes = {
        '400': 'Bad Request',
        '401': 'Unauthorized',
        '404': 'Not Found',
        '422': 'Public Key Failure', // note: technically this is unprocessible entity, but it throws for bad pk encryption
        '429': 'Too Many Requests',
        '500': 'Unexpected Server Error'
    };

    // check if its an expected error code, returning the relevant error
    if (failure_codes.hasOwnProperty(status_code)) {
        const failure = failure_codes[status_code];
        throw new Error(failure);
    }

    // reaching here implies it was an unexpected error code
    throw new Error('Unknown Status Code Error');
};