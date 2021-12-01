const axios = require('axios').default;
const risk_categories = require('./risk_categories.js');
const payment_status_enum = require('./payment_status_enum.js');
const payment_error_enum = require('./payment_error_enum.js');
const cvv_verification_status_enum = require('./cvv_verification_status_enum.js');
const three_d_secure_verification_status_enum = requir('./three_d_secure_verification_status_enum.js');

const api_uri_base = 'https://api-sandbox.circle.com/v1/';
const public_key_cache_duration = 1000 * 60 * 60 * 24; // 24 hours

module.exports = circle_integration = {
    TEST_CARDS: [
        {
            card_number: '4007400000000007',
            card_provider: 'Visa'
        },
        {
            card_number: '4007410000000006',
            card_provider: 'Visa'
        },
        {
            card_number: '4200000000000000',
            card_provider: 'Visa'
        },
        {
            card_number: '4757140000000001',
            card_provider: 'Visa'
        },
        {
            card_number: '5102420000000006',
            card_provider: 'Mastercard'
        },
        {
            card_number: '5173375000000006',
            card_provider: 'Mastercard'
        },
        {
            card_number: '5555555555554444',
            card_provider: 'Mastercard'
        },
    ],
    TEST_AMOUNTS_FOR_FAILURE_RESPONSES: {
        PAYMENT_FAILED: {
            amount: '5.01',
            description: 'Payment failed due to unspecified error'
        },
        CARD_NOT_HONORED: {
            amount: '5.04',
            description: 'Contact card issuer to query why payment failed'
        },
        PAYMENT_NOT_SUPPORTED_BY_ISSUER: {
            amount: '5.05',
            description: 'Issuer did not support the payment'
        },
        PAYMENT_NOT_FUNDED: {
            amount: '5.07',
            description: 'Insufficient funds in account to fund payment'
        },
        CARD_INVALID: {
            amount: '5.19',
            description: 'Invalid card number'
        },
        CARD_LIMIT_VIOLATED: {
            amount: '5.41',
            description: 'Exceeded amount or frequency limits'
        },
        PAYMENT_DENIED: {
            amount: '5.43',
            description: 'Payment denied by Circle Risk Service or card processor risk controls'
        },
        PAYMENT_FRAUD_DETECTED: {
            amount: '5.51',
            description: 'Payment suspected of being associated with fraud'
        },
        CREDIT_CARD_NOT_ALLOWED: {
            amount: '5.54',
            description: 'Issuer did not support using a credit card for payment'
        },
        PAYMENT_STOPPED_BY_ISSUER: {
            amount: '5.57',
            description: 'A stop has been placed on the payment or card'
        },
        CARD_ACCOUNT_INELIGIBLE: {
            amount: '5.84',
            description: 'Ineligible account associated with card'
        }
    },
    TEST_CVV_FOR_FAILURE_RESPONSES: [
        '000',
        '999'
    ],

    // by setting the address value for line 1 to the test value the described error will occur
    TEST_AVS_FOR_FAILURE_REPONSES: [
        {
            value: 'Test_A',
            result: 'Partial match',
            description: 'Street address matches, but both 5-digit and 9-digit ZIP Code do not match.'
        },
        {
            value: 'Test_B',
            result: 'Partial match',
            description: 'Street Address Match for International Transaction. Postal Code not verified due to incompatible formats.'
        },
        {
            value: 'Test_C',
            result: 'Verification unavailable',
            description: 'Address and Postal Code not verified for International Transaction due to incompatible formats.'
        },
        {
            value: 'Test_D',
            result: 'Full Match (International Transaction)',
            description: 'Address and Postal Code match for International Transaction.'
        },
        {
            value: 'Test_E',
            result: 'Data invalid',
            description: 'AVS data is invalid or AVS is not allowed for this card type.'
        },
        {
            value: 'Test_F',
            result: 'Full Match (UK only)',
            description: 'Street address and postal code match. Applies to U.K. only.'
        },
        {
            value: 'Test_G',
            result: 'Verification unavailable',
            description: 'Non-US Issuer does not participate.'
        },
        {
            value: 'Test_I',
            result: 'Verification unavailable',
            description: 'Address information not verified for international transaction.'
        },
        {
            value: 'Test_K',
            result: 'Address mismatch',
            description: 'Card member’s name matches but billing address and billing postal code do not match.'
        },
        {
            value: 'Test_L',
            result: 'Partial match',
            description: 'Card member’s name and billing postal code match, but billing address does not match.'
        },
        {
            value: 'Test_M',
            result: 'Full match (International Transaction)',
            description: 'Street Address match for international transaction. Address and Postal Code match.'
        },
        {
            value: 'Test_N',
            result: 'No match',
            description: 'No match for address or ZIP/postal code.'
        },
        {
            value: 'Test_O',
            result: 'Partial match',
            description: 'Card member’s name and billing address match, but billing postal code does not match.'
        },
        {
            value: 'Test_P',
            result: 'Partial match (International Transaction)',
            description: 'Postal code match. Acquirer sent both postal code and street address, but street address not verified due to incompatible formats.'
        },
        {
            value: 'Test_R',
            result: 'Verification unavailable',
            description: 'Issuer system unavailable, retry.'
        },
        {
            value: 'Test_S',
            result: 'Verification unavailable',
            description: 'AVS not supported'
        },
        {
            value: 'Test_U',
            result: 'Verification unavailable',
            description: 'Address unavailable'
        },
        {
            value: 'Test_W',
            result: 'Partial match',
            description: 'Postal code matches but address does not match'
        },
        {
            value: 'Test_X',
            result: 'Full match',
            description: 'Street address and postal code match'
        },
        {
            value: 'Test_Y',
            result: 'Full match',
            description: 'Street address and postal code match'
        },
        {
            value: 'Test_Z',
            result: 'Partial match',
            description: '5 digit zip code match only'
        },
        {
            value: 'Test_-',
            result: 'Verification unavailable',
            description: 'An error occurred attempting AVS check'
        }
    ],

    _call_circle: async (accepted_response_codes, method, url, data = null) => {
        // form request
        const request = {
            method: method,
            url: url
        };
        if (data !== null) {
            request.data = data;
        }
        
        // make request and catch any weird axios crashes
        let response;
        try {
            response = await axios(request);
        } catch (request_error) {
            return {
                error: {
                    status: 'error',
                    reason: 'server',
                    message: 'Unexpected request failure: ' + request_error.toString(),
                    payload: request_error
                }
            };
        }

        // handle unauthorized response which may be an http code or a code in the response body json
        if (response.status === 401 || (response.data.hasOwnProperty('code') && response.data.code === 401)) {
            return {
                error: {
                    status: 'error',
                    reason: 'server',
                    message: 'Unauthorized',
                    response_data: response.data
                }
            };
        }

        // handle not found response which may be an http code or a code in the response body json
        if (response.status === 404 || (response.data.hasOwnProperty('code') && response.data.code === 404)) {
            return {
                error: {
                    status: 'error',
                    reason: 'server',
                    message: 'Not Found',
                    response_data: response.data
                }
            };
        }

        // handle any non accepted_response_codes status code which is http codes only
        if (!accepted_response_codes.includes(response.status)) {
            return {
                error: {
                    status: 'error',
                    reason: 'server',
                    message: 'Unexpected status code: ' + response.status,
                    response_data: response.data
                }
            };
        }

        // handle malformed response body, all good respones are in the form {data: body}
        // note that axios responses have a field 'data' containing the response body, then circle has a parent json object with the field 'data', hence data.data
        if (!response.data.hasOwnProperty('data')) {
            return {
                error: {
                    status: 'error',
                    reason: 'server',
                    message: 'Unexpected response data',
                    payload: response
                }
            };
        }

        // get the response body from the response
        const response_body = response.data.data;

        // return just the response body
        return {
            response_body: response_body
        };

    },

    cached_public_key: null,
    cached_public_key_timestamp: null,
    get_public_key: async () => {
        // circle reccommends caching our public key which changes infrequently for at least 24 hours as per:
        // https://developers.circle.com/reference#getpublickey
        // check if we have a cached copy, and use it if cache is still good
        if (circle_integration.cached_public_key_timestamp === null || new Date().getTime() - circle_integration.cached_public_key_timestamp <= public_key_cache_duration) {
            return circle_integration.cached_public_key;
        }

        // if we have no cached key, or the cache has reached expiry, get a new public key from circle
        ({ error, response_body } = await circle_integration._call_circle([200], 'get', `${api_uri_base}encryption/public`));
        if (error) {
            return error;
        }

        // cache new key and record time of cache
        circle_integration.cached_public_key = response_body;
        circle_integration.cached_public_key_timestamp = new Date().getTime();

        // return public key
        return response_body;
    },

    create_card: async (idempotency_key, key_id, hashed_card_number, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year) => {
        // todo ensure this card isnt already on this account, flow for updating card?
        // todo fraud check to confirm this card hash isnt on any other account
        // todo whats the best way to get metadata into here, including sessioning?
        // todo we need to keep track of which cards belong to which users
        // todo more than X cards on an account should be a fraud indicator

        // call api to create card
        ({ error, response_body } = await circle_integration._call_circle([201], 'post', `${api_uri_base}cards`, {
            idempotencyKey: idempotency_key,
            keyId: key_id,
            encryptedData: encrypted_card_information,
            billingDetails: {
                name: name_on_card,
                city: city,
                country: country,
                line1: address_line_1,
                line2: address_line_2,
                district: district,
                postalCode: postal_zip_code
            },
            expMonth: expiry_month,
            expYear: expiry_year,
            metadata: {
                email: 'todo',
                phoneNumber: 'todo',
                sessionId: 'todo',
                ipAddress: 'todo'
            }
        }));
        if (error) {
            return error;
        }

        // reaching here implies card was created, return ok
        return {ok: 1};
    },

    update_card: async (key_id, card_id, encrypted_card_cvv, expiry_month, expiry_year) => {
        // call api to update card
        ({ error, response_body } = await circle_integration._call_circle([200], 'put', `${api_uri_base}cards/${card_id}`, {
            keyId: key_id,
            encryptedData: encrypted_card_cvv,
            expMonth: expiry_month,
            expYear: expiry_year
        }));
        if (error) {
            return error;
        }
        
        // reaching here implies the card was updated, return ok
        return {ok: 1};
    },

    list_sale_items: async () => {
        // todo what if we want sale items per user or something? maybe a delegate to get that from integrator

        // return some demo items
        return [
            {
                "sale_item_key": "NEON_1000",
                "currency": "USD",
                "amount": "1.00",
                "statement_description": "NEON DISTRICT: 1000 NEON",
                "store_description": "Adds 1000 NEON to your account.",
                "store_image": "https://images/NEON_1000.png"
            },
            {
                "sale_item_key": "NEON_5000",
                "currency": "USD",
                "amount": "5.00",
                "statement_description": "NEON DISTRICT: 5000 NEON",
                "store_description": "Adds 5000 NEON to your account.",
                "store_image": "https://images/NEON_5000.png"
            },
            {
                "sale_item_key": "NEON_20000",
                "currency": "USD",
                "amount": "20.00",
                "statement_description": "NEON DISTRICT: 20000 NEON",
                "store_description": "Adds 20000 NEON to your account.",
                "store_image": "https://images/NEON_20000.png"
            }
        ];
    },

    make_purchase: async (idempotency_key, card_id, key_id, encrypted_card_cvv, sale_item_key) => {
        // todo we should have a hashset of sale items by sale_item_key

        // grab a fake demo item regardless of sale_item_Key for now
        const sale_item = {
            "sale_item_key": "NEON_1000",
            "currency": "USD",
            "amount": "1.00",
            "statement_description": "NEON DISTRICT: 1000 NEON",
            "store_description": "Adds 1000 NEON to your account.",
            "store_image": "https://images/NEON_1000.png"
        };

        // create a payment
        ({ error, response_body } = await circle_integration._call_circle([201], 'post', `${api_uri_base}payments`, {
            idempotencyKey: idempotency_key,
            keyId: key_id,
            metadata: {
                email: 'todo',
                phoneNumber: 'todo',
                sessionId: 'todo',
                ipAddress: 'todo',
            },
            amount: {
                amount: sale_item.amount,
                currency: sale_item.currency
            },
            autoCapture: true,
            verification: 'three_d_secure',
            verificationSuccessUrl: 'todo',
            verificationFailureUrl: 'todo',
            source: {
                id: card_id,
                type: 'card'
            },
            description: sale_item.statement_description,
            encryptedData: encrypted_card_cvv,
            channel: 'todo, what is a channel in this context?'
        }));
        if (error) {
            return error;
        }

        // assess the purchase result, null means pending and will require further polling
        const assessed_result = await circle_integration._assess_purchase_result(response_body);
        if (assessed_result !== null) {
            return assessed_result;
        }

        // get the payment id which we will use to poll for its completion
        const payment_id = result.id;

        // poll until we get a result
        circle_integration.poll_for_purchase_result(payment_id);
    },

    poll_for_purchase_result: async (payment_id) => {
        // poll until we can resolve the payment as either success or failure
        while (1) {
            // call to request the payment
            ({ error, response_body } = await circle_integration._call_circle([20], 'get', `${api_uri_base}payments/${payment_id}`,));
            if (error) {
                return error;
            }

            // assess the purchase poll result, null means pending and will require further polling
            const assessed_poll_result = await circle_integration._assess_purchase_result(response_body);
            if (assessed_poll_result !== null) {
                return assessed_poll_result;
            }

            // pause between polls
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            // poll again
            continue;
        }
    },

    _assess_purchase_result: async (result) => {
        // assess the purchase risk
        const assessed_risk_result = circle_integration._assess_purchase_risk(result);
        if (assessed_risk_result !== null) {
            return assessed_risk_result;
        }
        
        // check the status
        switch (result.status) {

            // confirmed and paid are equivalent for considering the payment a success, paid just implies its in our wallet now
            case payment_status_enum.CONFIRMED:
            case payment_status_enum.PAID:
                return {
                    ok: 1
                };

            // failed implies that the the payment is complete and will never be successful, figure out what the reason was to
            // determine what we tell the player and if they should retry the payment or not (with a new payment)
            case payment_status_enum.FAILED:
                return circle_integration._assess_purchase_failure(result);
            
            // pending means we just need to wait, and continue polling for the result - null here implies pending
            case payment_status_enum.PENDING:
                return null;
            
            // action required means the player will need to be redirected to verify payment
            case payment_status_enum.ACTION_REQUIRED:
                return {
                    status: 'redirect_required',
                    redirect_url: result.requiredAction.redirectUrl,
                    success_url: 'todo',
                    failure_url: 'todo'
                };
            
            // handle unexpected status
            default:
                return {
                    status: 'error',
                    reason: 'server',
                    message: 'Unexpected result status: ' + result.status,
                    payload: response.data
                };
        }
    },

    _assess_purchase_risk: async (result) => {
        // if a risk evaluation is present, along with a decision, and that decision is denied we have failed the payment from risk, determine why
        if (result.hasOwnProperty('riskEvaluation') && result.riskEvalutaion.hasOwnProperty('decision') && result.riskEvalutaion.decision === 'denied') {
            // get the reason code from the result
            const reason_code = result.riskEvalutaion.reason;

            // attempt to find the risk category
            let found_risk_category = null;
            for (const risk_category in risk_categories) {
                
                // if the reason code is in the range for this category we found the category
                if (reason_code >= risk_category.range.lower_inclusive && reason_code <= risk_category.range.upper_inclusive) {
                    found_risk_category = risk_category;
                    break;
                }
            }

            // if we did not find the risk category we have an unexpected risk code, crash
            if (found_risk_category === null) {
                return {
                    status: 'failed_no_retry',
                    reason: 'server',
                    message: 'Unexpected risk result: ' + reason_code,
                    payload: result
                }; 
            }

            // reaching here implies we have a found_risk_category, attempt to find a specific reason
            let found_specific_reason = null;
            for (const specific_reason in found_risk_category.specific_reasons) {
                
                // if the specific reason code matches we found the specific reason
                if (specific_reason.code === reson_code) {
                    found_specific_reason = specific_reason;
                    break;
                }
            }

            // we may or may not have found a specific reason, but the category is all that is gauranteed
            // return whatever we have
            return {
                status: 'fraud',
                reason: 'player',
                message: `code: ${reason_code}: ${found_risk_category.category}: ${found_risk_category.description} (${found_specific_reason === null ? 'no specific reason found' : found_specific_reason.description})`,
                payload: result
            };

        // reaching here implies there was no risk evaluation, or nested decision, or the decision was not denied, meaning no risk, return null to inidicate no risk
        } else {
            
            return null;
        }
    },

    _assess_purchase_failure: async (result) => {
        // todo this whole clusterfuck should probably illicit a bunch of different responses
        switch (result.errorCode) {
            case payment_error_enum.PAYMENT_FAILED:
                return {
                    status: 'failed_retry',
                    reason: 'player',
                    message: result.errorCode,
                    payload: response
                };

            case payment_error_enum.PAYMENT_FRAUD_DETECTED:
                return {
                    status: 'fraud',
                    reason: 'player',
                    message: result.errorCode,
                    payload: response
                };

            case payment_error_enum.PAYMENT_DENIED:
            case payment_error_enum.PAYMENT_NOT_SUPPORTED_BY_ISSUER:
            case payment_error_enum.PAYMENT_NOT_FUNDED:
            case payment_error_enum.PAYMENT_UNPROCESSABLE:
            case payment_error_enum.PAYMENT_STOPPED_BY_ISSUER:
            case payment_error_enum.PAYMENT_CANCELED:
            case payment_error_enum.PAYMENT_RETURNED:
            case payment_error_enum.PAYMENT_FAILED_BALANCE_CHECK:
            case payment_error_enum.CARD_FAILED:
            case payment_error_enum.CARD_INVALID:
            case payment_error_enum.CARD_ADDRESS_MISMATCH:
            case payment_error_enum.CARD_ZIP_MISMATCH:
            case payment_error_enum.CARD_CVV_INVALID:
            case payment_error_enum.CARD_EXPIRED:
            case payment_error_enum.CARD_LIMIT_VIOLATED:
            case payment_error_enum.CARD_NOT_HONORED:
            case payment_error_enum.CARD_CVV_REQUIRED:
            case payment_error_enum.CREDIT_CARD_NOT_ALLOWED:
            case payment_error_enum.CARD_ACCOUNT_INELIGIBLE:
            case payment_error_enum.CARD_NETWORK_UNSUPPORTED:
            case payment_error_enum.CHANNEL_INVALID:
            case payment_error_enum.UNAUTHORIZED_TRANSACTION:
            case payment_error_enum.BANK_ACCOUNT_INELIGIBLE:
            case payment_error_enum.BANK_TRANSACTION_ERROR:
            case payment_error_enum.INVALID_ACCOUNT_NUMBER:
            case payment_error_enum.INVALID_WIRE_RTN:
            case payment_error_enum.INVALID_ACH_RTN:
                return {
                    status: 'failed_no_retry',
                    reason: 'player',
                    message: result.errorCode,
                    payload: response
                };

            // handle unexpected error code
            default:
                return {
                    status: 'error',
                    reason: 'server',
                    message: 'Unexpected result errorCode: ' + result.errorCode,
                    payload: response
                };
        }
    }
};