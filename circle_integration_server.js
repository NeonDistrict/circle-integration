const axios = require('axios').default;
const risk_categories = require('./risk_categories.js');
const payment_status_enum = require('./payment_status_enum.js');
const payment_error_enum = require('./payment_error_enum.js');
const cvv_verification_status_enum = require('./cvv_verification_status_enum.js');
const three_d_secure_verification_status_enum = requestAnimationFrame('./three_d_secure_verification_status_enum.js');
const sale_items = require('./sale_items.js');

const api_uri_base = 'https://api-sandbox.circle.com/v1/';
const public_key_cache_duration = 1000 * 60 * 60 * 24; // 24 hours

// todo, okay for subs when we startup we need to get a list of subs, remove all of them, create them again, then start serving requests
// oh okay allll subs come through one endpoint
// todo how the fuck do we security sandbox the payment gateway to receive posts from aws sns and only our server, actually wait thats
// probably not too bad since we are on aws

// todo, it looks liekw e need to be looking at the status pending to go to sub parking
// todo really need to unify these errors and return formats

module.exports = circle_integration = {
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
        if (response.status === 400 || (response.data.hasOwnProperty('code') && response.data.code === 400)) {
            return {
                error: {
                    status: 'error',
                    reason: 'server',
                    message: 'Bad Request',
                    payload: response
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
                    payload: response
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
                    payload: response
                }
            };
        }

        // handle too many requests which may be an http code or a code in the response body json
        if (response.status === 429 || (response.data.hasOwnProperty('code') && response.data.code === 429)) {
            return {
                error: {
                    status: 'error',
                    reason: 'server',
                    message: 'Too Many Requests',
                    payload: response
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
                    payload: response
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
    
    setup_notifications_subscription: async () => {
        // many calls to circle such as adding a card, or creating a payment can take time to process
        // rather than hammering circle with polling requests they provide an aws sns hook that we can
        // use to listen for all responses when they complete so that we dont need to poll

        // this notifications subscription must be cleaned up, then recreated at boot time prior to the
        // circle integration server becoming available for requests, otherwise notifications may be missed

        // first we list any existing subscriptions
        ({ error, response_body } = await circle_integration._call_circle([200], 'get', `${api_uri_base}notifications/subscriptions`));
        if (error) {
            return {
                error: error
            };
        }
        const existing_subscriptions = response_body;

        // if any subscriptions exist remove them
        for (const existing_subscription of existing_subscriptions) {
            const existing_subscription_id = existing_subscription.id;

            // delete this subscription
            ({ error, response_body } = await circle_integration._call_circle([200], 'delete', `${api_uri_base}notifications/subscriptions/${existing_subscription_id}`));
            if (error) {
                return {
                    error: error
                };
            }

            // response_body here is empty, the 200 response signifies the operation was a success
        }

        // create or recreate the notification subscription
        // note that its a 200 that comes back, not a 201 created, the errata has been reported but is unlikely to be changed
        ({ error, response_body } = await circle_integration._call_circle([200], 'post', `${api_uri_base}notifications/subscriptions`, {
            endpoint: 'todo'
            // todo this endpoint must be https, and must be available before this call is made
        }));
        if (error) {
            return {
                error: error
            };
        }

        // response_body here has subscription details, but we dont store them as we recreate every boot, 200 is good to go
        return {};
    },

    on_notification: async (notification) => {
        // so first we get a subscription confirmation notification with a url to get to confirm our subscription
        // upon receiveing this, and confirming we return a special notification_confirmed that the router will then
        // use to activate the rest of the routes, opening the server for use

        // todo all of that shit no idea what that response looks like?
        return {
            notification_confirmed: 1
        };

        // todo other responses need to go into some kind of a local queue, stored to the db which can be checked on re request,
        // and it should trigger parked requests while they remain open, maybe a parked callback with some careful guardrails on 
        // sending the request in case it has timed out or been disconnected in the interim all of which should be logged
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
            return {
                error: error
            };
        }

        // public key is response body
        const public_key = response_body;

        // cache new key and record time of cache
        circle_integration.cached_public_key = public_key;
        circle_integration.cached_public_key_timestamp = new Date().getTime();

        // return public key
        return {
            public_key: public_key
        };
    },

    _create_card: async (idempotency_key, key_id, hashed_card_number, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year) => {
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
            return {
                error: error
            };
        }

        // todo this is probably an sns callback or some shit

        const card_id = response_body.id;

        // reaching here implies we created a card, return card id
        return {
            card_id: card_id
        };
    },

    list_sale_items: async () => {
        // todo what if we want sale items per user or something? maybe a delegate to get that from integrator

        // return some demo items
        return sale_items;
    },

    purchase: async (idempotency_key, sale_item_key, key_id, hashed_card_number, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year) => {        
        // find sale item by sale_item_key
        const sale_item = sale_items.find((search_sale_item) => { return search_sale_item.sale_item_key === sale_item_key; });
        
        // if we couldnt find the sale item puke
        if (sale_item === undefined || sale_item === null) {
            return {
                error: {
                    status: 'error',
                    reason: 'server',
                    message: 'Sale item not found',
                    payload: sale_item_key
                }
            };
        }
        
        // first we need to create the card before making a payment with it
        // todo we are going to need to assest the create card result as well
        ({error, card_id} = await circle_integration._create_card(idempotency_key, key_id, hashed_card_number, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year));
        if (error) {
            return {
                error: error
            };
        }

        // we need a second idempotency key for the purchase, which we can generate here
        const purchase_idempotency_key = 'todo';

        // create a payment
        ({ error, response_body } = await circle_integration._call_circle([201], 'post', `${api_uri_base}payments`, {
            idempotencyKey: purchase_idempotency_key,
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
            return {
                error: error
            };
        }

        // assess the purchase result, null means pending and will require further polling
        const assessed_result = await circle_integration._assess_purchase_result(response_body);
        if (assessed_result !== null) {
            return assessed_result;
        }

        // get the payment id which we will use to poll for its completion
        const payment_id = result.id;

        // poll until we get a result
        // todo this will be a sub
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
    },

    purchase_history: async (user_id) => {

    }
};