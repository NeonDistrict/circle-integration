const axios = require('axios').default;
const api_uri_base = 'https://api-sandbox.circle.com/v1/';
const public_key_cache_duration = 1000 * 60 * 60 * 24; // 24 hours

module.exports = circle_integration = {
    PAYMENT_STATUS: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        PAID: 'paid',
        FAILED: 'failed',
        ACTION_REQUIRED: 'action_required'
    },
    CVV_VERIFICACTION_STATUS: {
        NOT_REQUESTED: 'not_requested',
        PASS: 'pass',
        FAIL: 'fail',
        UNAVAILABLE: 'unavailable',
        PENDING: 'pending'
    },
    THREE_D_SECURE_VERIFICATION_STATUS: {
        PASS: 'pass',
        FAIL: 'fail'
    },
    PAYMENT_ERROR_CODES: {
        PAYMENT_FAILED: 'payment_failed', 
        PAYMENT_FRAUD_DETECTED: 'payment_fraud_detected', 
        PAYMENT_DENIED: 'payment_denied', 
        PAYMENT_NOT_SUPPORTED_BY_ISSUER: 'payment_not_supported_by_issuer', 
        PAYMENT_NOT_FUNDED: 'payment_not_funded', 
        PAYMENT_UNPROCESSABLE: 'payment_unprocessable', 
        PAYMENT_STOPPED_BY_ISSUER: 'payment_stopped_by_issuer', 
        PAYMENT_CANCELED: 'payment_canceled', 
        PAYMENT_RETURNED: 'payment_returned', 
        PAYMENT_FAILED_BALANCE_CHECK: 'payment_failed_balance_check', 
        CARD_FAILED: 'card_failed', 
        CARD_INVALID: 'card_invalid', 
        CARD_ADDRESS_MISMATCH: 'card_address_mismatch', 
        CARD_ZIP_MISMATCH: 'card_zip_mismatch', 
        CARD_CVV_INVALID: 'card_cvv_invalid', 
        CARD_EXPIRED: 'card_expired', 
        CARD_LIMIT_VIOLATED: 'card_limit_violated', 
        CARD_NOT_HONORED: 'card_not_honored', 
        CARD_CVV_REQUIRED: 'card_cvv_required', 
        CREDIT_CARD_NOT_ALLOWED: 'credit_card_not_allowed', 
        CARD_ACCOUNT_INELIGIBLE: 'card_account_ineligible', 
        CARD_NETWORK_UNSUPPORTED: 'card_network_unsupported', 
        CHANNEL_INVALID: 'channel_invalid', 
        UNAUTHORIZED_TRANSACTION: 'unauthorized_transaction', 
        BANK_ACCOUNT_INELIGIBLE: 'bank_account_ineligible', 
        BANK_TRANSACTION_ERROR: 'bank_transaction_error', 
        INVALID_ACCOUNT_NUMBER: 'invalid_account_number', 
        INVALID_WIRE_RTN: 'invalid_wire_rtn', 
        INVALID_ACH_RTN: 'invalid_ach_rtn'
    },
    RISK_ERROR_CODES: [
        {
            category: 'Circle Unsupported',
            description: 'Fiat Account / Payment contains criteria that Circle is unable to support at this time. E.g. Prohibited Country.',
            range: {
                lower_inclusive: 3000,
                upper_inclusive: 3099
            },
            codes: [
                {
                    code: 3000,
                    description: 'Default',
                },
                {
                    code: 3001,
                    description: 'Prohibited Issuer (Bank) Country',
                },
                {
                    code: 3002,
                    description: 'Prohibited Billing Address Country',
                },
                {
                    code: 3020,
                    description: 'Fiat Account Denied (See Fiat Account for Reason)',
                },
                {
                    code: 3021,
                    description: 'Fiat Account Failed (See Fiat Account for Reason)',
                },
                {
                    code: 3022,
                    description: 'Fiat Account (Card) Evaluation Timeout. We recommend retrying.',
                },
                {
                    code: 3023,
                    description: 'Fiat Account (Bank Account) Evaluation Timeout. We recommend retrying.',
                },
                {
                    code: 3024,
                    description: 'Fiat Account Evaluation Suspended. Information has been requested or fiat is awaiting review.',
                },
                {
                    code: 3030,
                    description: 'Unsupported Bank Account Routing Number (rtn)',
                },
                {
                    code: 3050,
                    description: 'Customer suspended from Payment Processing',
                },
                {
                    code: 3070,
                    description: 'Limit for Transaction exceeded',
                },
                {
                    code: 3071,
                    description: 'Limit for Daily Aggregate exceeded (email)',
                },
                {
                    code: 3072,
                    description: 'Limit for Daily Aggregate exceeded (fiat)',
                },
                {
                    code: 3075,
                    description: 'Limit for Weekly Aggregate exceeded (email)',
                },
                {
                    code: 3076,
                    description: 'Limit for Weekly Aggregate exceeded (fiat)',
                }
            ]
        },
        {
            category: 'Processor / Issuing Bank',
            description: 'Fiat Account / Payment creation contains criteria that Circles processor partner or Issuing Bank are unable to accept. E.g. unsupported issuer country, authorization failure.',
            range: {
                lower_inclusive: 3100,
                upper_inclusive: 3199
            },
            codes: [
                {
                    code: 3100,
                    description: 'Unsupported Return Code Response from Processor / Issuing Bank - Default'
                },
                {
                    code: 3101,
                    description: 'Invalid Return Code Response from Issuing Bank E.g Invalid Card'
                },
                {
                    code: 3102,
                    description: 'Fraudulent Return Code Response from Issuing Bank E.g Pickup Card'
                },
                {
                    code: 3103,
                    description: 'Redlisted Entity Return Code Response from Processor E.g Card Redlisted'
                },
                {
                    code: 3104,
                    description: 'Account associated with an invalid ACH RTN'
                },
                {
                    code: 3150,
                    description: 'Administrative return from ODFI / RDFI'
                },
                {
                    code: 3151,
                    description: 'Return indicating ineligible account from customer / RDFI'
                },
                {
                    code: 3152,
                    description: 'Unsupported transaction type return from customer / RDFI'
                }
            ]
        },
        {
            category: 'Regulatory Compliance Intervention',
            description: 'Interventions by Circle Risk Service due to legal & regulatory compliance requirements. E.g. KYC verification limits.',
            range: {
                lower_inclusive: 3200,
                upper_inclusive: 3299
            },
            codes: [
                {
                    code: 3200,
                    description: 'Unsupported Criteria'
                },
                {
                    code: 3201,
                    description: 'Unsupported Criteria'
                },
                {
                    code: 3202,
                    description: 'Unsupported Criteria'
                },
                {
                    code: 3210,
                    description: 'Withdrawal Limit Exceeded (7 Day Default Payout Limit)'
                },
                {
                    code: 3211,
                    description: 'Withdrawal Limit Exceeded (7 Day Custom Payout Limit)'
                },
                {
                    code: 3220,
                    description: 'Compliance Limit Exceeded'
                }
            ]
        },
        {
            category: 'Fraud Risk Intervention',
            description: 'Fiat Account / Payment creation was actioned by Circles Risk Service due to identified fraud management issues. E.g. Excessive Chargeback Rates, Immediate Fraud Pressure.',
            range: {
                lower_inclusive: 3300,
                upper_inclusive: 3499
            },
            codes: [
                {
                    code: 3300,
                    description: 'Transaction Declined by Circle Risk Service'
                },
                {
                    code: 3310,
                    description: 'Fiat Account directly associated with fraudulent activity'
                },
                {
                    code: 3311,
                    description: 'Email Address directly associated with fraudulent activity'
                },
                {
                    code: 3320,
                    description: 'Fiat Account associated with network fraud notification'
                },
                {
                    code: 3321,
                    description: 'Email Account associated with network fraud notification'
                },
                {
                    code: 3330,
                    description: 'Fiat Account flagged by Risk Team'
                },
                {
                    code: 3331,
                    description: 'Email Account flagged by Risk team'
                },
                {
                    code: 3340,
                    description: 'Fiat Account linked to previous fraudulent activity'
                },
                {
                    code: 3341,
                    description: 'Email Address linked to previous fraudulent activity'
                }
            ]
        },
        {
            category: 'Customer Unsupported Configurations',
            description: 'Fiat Account / Payment creation was actioned by Circles Risk Service due to customer configuration on block list where associated entity was labelled "unsupported". E.g. Block Issuer Country, Block Card Type, etc.',
            range: {
                lower_inclusive: 3500,
                upper_inclusive: 3599
            },
            codes: [
                {
                    code: 3500,
                    description: 'Blocked Issuer (Bank) Country'
                },
                {
                    code: 3501,
                    description: 'Blocked Billing Address Country'
                },
                {
                    code: 3520,
                    description: 'Blocked Card Type E.g. Credit'
                },
                {
                    code: 3530,
                    description: 'Chargeback History on Circle Platform'
                },
                {
                    code: 3531,
                    description: 'Chargeback History on Circle Platform'
                },
                {
                    code: 3532,
                    description: 'Chargeback History on Circle Platform'
                },
                {
                    code: 3533,
                    description: 'Chargeback History on Circle Platform'
                },
                {
                    code: 3534,
                    description: 'Chargeback History on Circle Platform'
                },
                {
                    code: 3535,
                    description: 'Chargeback History on Circle Platform'
                },
                {
                    code: 3536,
                    description: 'Chargeback History on Circle Platform'
                },
                {
                    code: 3537,
                    description: 'Chargeback History on Circle Platform'
                },
                {
                    code: 3538,
                    description: 'Chargeback History on Circle Platform'
                },
                {
                    code: 3539,
                    description: 'Chargeback History on Circle Platform'
                },
                {
                    code: 3540,
                    description: 'Chargeback History on Customer Platform'
                },
                {
                    code: 3541,
                    description: 'Chargeback History on Customer Platform'
                },
                {
                    code: 3542,
                    description: 'Chargeback History on Customer Platform'
                },
                {
                    code: 3543,
                    description: 'Chargeback History on Customer Platform'
                },
                {
                    code: 3544,
                    description: 'Chargeback History on Customer Platform'
                },
                {
                    code: 3545,
                    description: 'Chargeback History on Customer Platform'
                },
                {
                    code: 3546,
                    description: 'Chargeback History on Customer Platform'
                },
                {
                    code: 3547,
                    description: 'Chargeback History on Customer Platform'
                },
                {
                    code: 3548,
                    description: 'Chargeback History on Customer Platform'
                },
                {
                    code: 3549,
                    description: 'Chargeback History on Customer Platform'
                },
                {
                    code: 3550,
                    description: 'Blocked Fiat (Card)'
                },
                {
                    code: 3551,
                    description: 'Blocked Email Address'
                },
                {
                    code: 3552,
                    description: 'Blocked Phone Number'
                }
            ]
        },
        {
            category: 'Customer Fraud Configurations',
            description: 'Fiat Account / Payment creation was actioned by Circles Risk Service due to customer configuration on block list where associated entity was labelled "fraud". E.g. Block Issuer Country, Block Card Type, etc.',
            range: {
                lower_inclusive: 3600,
                upper_inclusive: 3699
            },
            codes: [
                // all codes are just described as 'Blocked by fraud watchlist'
            ]
        }
    ],


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

    _check_response_code: (accept_codes, response) => {
        // handle unauthorized response
        if (response.status === 401 || (response.data.hasOwnProperty('code') && response.data.code === 401)) {
            return {
                status: 'error',
                reason: 'server',
                message: 'Unauthorized',
                response_data: response.data
            };
        }

        // handle not found response
        if (response.status === 404 || (response.data.hasOwnProperty('code') && response.data.code === 404)) {
            return {
                status: 'error',
                reason: 'server',
                message: 'Not Found',
                response_data: response.data
            };
        }

        // handle any non accept_codes status code
        if (!accept_codes.includes(response.status)) {
            return {
                status: 'error',
                reason: 'server',
                message: 'Unexpected status code: ' + response.status,
                response_data: response.data
            };
        }

        // null implies accepted code
        return null;
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
        const response = await axios({
            method: 'get',
            url: `${api_uri_base}encryption/public`
        });
        
        // confirm status code 200
        if (response.status !== 200) {
            console.log('response:', response);
            throw new Error('Expected status code 200 from circle');
        }
        
        // confirm response has a data parent object
        if (!response.data.hasOwnProperty('data')) {
            console.log('response:', response);
            throw new Error('Expected data in response from circle');
        }

        // unpack data parent object
        const public_key = response.data.data;

        // cache new key and record time of cache
        circle_integration.cached_public_key = public_key;
        circle_integration.cached_public_key_timestamp = new Date().getTime();

        return public_key;
    },

    create_card: async (idempotency_key, key_id, hashed_card_number, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year) => {
        // todo ensure this card isnt already on this account, flow for updating card?
        // todo fraud check to confirm this card hash isnt on any other account
        // todo whats the best way to get metadata into here, including sessioning?
        // todo we need to keep track of which cards belong to which users
        // todo more than X cards on an account should be a fraud indicator

        // call api to create card
        const response = await axios({
            method: 'post',
            url: `${api_uri_base}cards`,
            data: {
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
            }
        });
        
        // confirm status code of 201 created
        if (response.status !== 201) {
            console.log('response:', response);
            throw new Error('Expected status code 201 from circle');
        }
        
        // confirm response has a data parent object
        if (!response.data.hasOwnProperty('data')) {
            console.log('response:', response);
            throw new Error('Expected data in response from circle');
        }

        // unpack data parent object
        const created_card = response.data.data;

        // we just need to acknowledge that the card was created, a call will be made to list for details
        
        return {ok: 1};
    },

    update_card: async (key_id, card_id, encrypted_card_cvv, expiry_month, expiry_year) => {
        // call api to update card
        const response = await axios({
            method: 'put',
            url: `${api_uri_base}cards/${card_id}`,
            data: {
                keyId: key_id,
                encryptedData: encrypted_card_cvv,
                expMonth: expiry_month,
                expYear: expiry_year
            }
        });
        
        // confirm status code of 200 
        if (response.status !== 200) {
            console.log('response:', response);
            throw new Error('Expected status code 200 from circle');
        }
        
        // confirm response has a data parent object
        if (!response.data.hasOwnProperty('data')) {
            console.log('response:', response);
            throw new Error('Expected data in response from circle');
        }

        // unpack data parent object
        const updated_card = response.data.data;

        // we just need to acknowledge that the card was updated, a call will be made to list for details
        
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
        const response =  await axios({
            method: 'post',
            url: `${api_uri_base}payments`,
            data: {
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
            }
        });

        // check the response code, null means ok
        const response_code_check_result = circle_integration._check_response_code([201], response);
        if (response_code_check_result !== null) {
            return response_code_check_result;
        }

        // handle malformed response
        if (!response.data.hasOwnProperty('data')) {
            return {
                status: 'error',
                reason: 'server',
                message: 'Unexpected response data',
                response_data: response.data
            };
        }

        // get the result from the response
        const result = response.data.data;

        // assess the purchase result, null means pending and will require further polling
        const assessed_result = await circle_integration._assess_purchase_result(result);
        if (assessed_result !== null) {
            return assessed_result;
        }

        // get the payment id which we will use to poll for its completion
        const payment_id = result.id;

        // poll until we can resolve the payment as either success or failure
        while (1) {
            // call to request the payment
            const poll_response =  await axios({
                method: 'get',
                url: `${api_uri_base}payments/${payment_id}`
            });

            // check the response code, null means ok
            const poll_response_code_check_result = circle_integration._check_response_code([201], poll_response);
            if (poll_response_code_check_result !== null) {
                return poll_response_code_check_result;
            }

            // handle malformed response
            if (!poll_response.data.hasOwnProperty('data')) {
                return {
                    status: 'error',
                    reason: 'server',
                    message: 'Unexpected response data',
                    response_data: poll_response.data
                };
            }

            // get the result from the response
            const poll_result = poll_response.data.data;

            // assess the purchase poll result, null means pending and will require further polling
            const assessed_poll_result = await circle_integration._assess_purchase_result(poll_result);
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
        // todo we need to assess the purchase risk here too
        
        
        // check the status
        switch (result.status) {

            // confirmed and paid are equivalent for considering the payment a success, paid just implies its in our wallet now
            case circle_integration.PAYMENT_STATUS.CONFIRMED:
            case circle_integration.PAYMENT_STATUS.PAID:
                return {
                    ok: 1
                };

            // failed implies that the the payment is complete and will never be successful, figure out what the reason was to
            // determine what we tell the player and if they should retry the payment or not (with a new payment)
            case circle_integration.PAYMENT_STATUS.FAILED:
                return circle_integration._assess_purchase_failure(result);
            
            // pending means we just need to wait, and continue polling for the result - null here implies pending
            case circle_integration.PAYMENT_STATUS.PENDING:
                return null;
            
            // action required means the player will need to be redirected to verify payment
            case circle_integration.PAYMENT_STATUS.ACTION_REQUIRED:
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
                    response_data: response.data
                };
        }
    },

    _assess_purchase_failure: async (result) => {
        switch (result.errorCode) {

            case circle_integration.PAYMENT_ERROR_CODES.PAYMENT_FAILED:
                return {
                    status: 'failed_retry',
                    reason: 'player',
                    message: result.errorCode,
                    response_data: response.data
                };

            case circle_integration.PAYMENT_ERROR_CODES.PAYMENT_FRAUD_DETECTED:
                return {
                    status: 'fraud',
                    reason: 'player',
                    message: result.errorCode,
                    response_data: response.data
                };

            case circle_integration.PAYMENT_ERROR_CODES.PAYMENT_DENIED:
            case circle_integration.PAYMENT_ERROR_CODES.PAYMENT_NOT_SUPPORTED_BY_ISSUER:
            case circle_integration.PAYMENT_ERROR_CODES.PAYMENT_NOT_FUNDED:
            case circle_integration.PAYMENT_ERROR_CODES.PAYMENT_UNPROCESSABLE:
            case circle_integration.PAYMENT_ERROR_CODES.PAYMENT_STOPPED_BY_ISSUER:
            case circle_integration.PAYMENT_ERROR_CODES.PAYMENT_CANCELED:
            case circle_integration.PAYMENT_ERROR_CODES.PAYMENT_RETURNED:
            case circle_integration.PAYMENT_ERROR_CODES.PAYMENT_FAILED_BALANCE_CHECK:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_FAILED:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_INVALID:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_ADDRESS_MISMATCH:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_ZIP_MISMATCH:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_CVV_INVALID:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_EXPIRED:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_LIMIT_VIOLATED:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_NOT_HONORED:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_CVV_REQUIRED:
            case circle_integration.PAYMENT_ERROR_CODES.CREDIT_CARD_NOT_ALLOWED:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_ACCOUNT_INELIGIBLE:
            case circle_integration.PAYMENT_ERROR_CODES.CARD_NETWORK_UNSUPPORTED:
            case circle_integration.PAYMENT_ERROR_CODES.CHANNEL_INVALID:
            case circle_integration.PAYMENT_ERROR_CODES.UNAUTHORIZED_TRANSACTION:
            case circle_integration.PAYMENT_ERROR_CODES.BANK_ACCOUNT_INELIGIBLE:
            case circle_integration.PAYMENT_ERROR_CODES.BANK_TRANSACTION_ERROR:
            case circle_integration.PAYMENT_ERROR_CODES.INVALID_ACCOUNT_NUMBER:
            case circle_integration.PAYMENT_ERROR_CODES.INVALID_WIRE_RTN:
            case circle_integration.PAYMENT_ERROR_CODES.INVALID_ACH_RTN:
                return {
                    status: 'failed_no_retry',
                    reason: 'player',
                    message: result.errorCode,
                    response_data: response.data
                };

            // handle unexpected error code
            default:
                return {
                    status: 'error',
                    reason: 'server',
                    message: 'Unexpected result errorCode: ' + result.errorCode,
                    response_data: response.data
                };
        }
    }
};