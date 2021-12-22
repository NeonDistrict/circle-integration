const { v4: uuidv4 } = require('uuid');
const axios = require('axios').default.create();
const risk_categories = require('./enum/risk_categories.js');
const add_card_status_enum = require('./enum/add_card_status_enum.js');
const payment_status_enum = require('./enum/payment_status_enum.js');
const payment_error_enum = require('./enum/payment_error_enum.js');
const cvv_verification_status_enum = require('./enum/cvv_verification_status_enum.js');
const three_d_secure_verification_status_enum = require('./enum/three_d_secure_verification_status_enum.js');
const sale_items = require('./sale_items.dev.js');
const req = require('express/lib/request');

const api_uri_base = 'https://api-sandbox.circle.com/v1/';
const api_sandbox_key = 'QVBJX0tFWTozZjk5YzRmMDdlZjJlM2RkNjlmNjVmNzk5YjU5YjE2NzowODc0NDVhMzk1NjY3YjU2MWY4OTBjODk1NjVlMTg3Mg==';
const public_key_cache_duration = 1000 * 60 * 60 * 24; // 24 hours

// todo, okay for subs when we startup we need to get a list of subs, remove all of them, create them again, then start serving requests
// oh okay allll subs come through one endpoint
// todo how the fuck do we security sandbox the payment gateway to receive posts from aws sns and only our server, actually wait thats
// probably not too bad since we are on aws

// todo, it looks liekw e need to be looking at the status pending to go to sub parking
// todo really need to unify these errors and return formats

// todo adding a card has no id associated with it other than the card id, which maybe we could use as the callback hook?
// making a payment gives you a payment id to use as a callback hook.
// perhaps the callback system does a two way check, when we register for a callback we can check if a callback is already waiting
// and if no callback is already waiting then we can add a callback, there could also be a period check to address any missed connections
// which would be an extremely rare race condition that should be reported when it happens

// todo need to verify the behaviour if a call returns with success, and if a notification comes in for an already resolved situation which
// may or may not have a callback parked. a periodic sweep should also check if calls are already resolved and dismiss them, this should also
// be recorded. this will have to against the db

// todo handle callback timeouts (like the callback never comes)

// todo handle the request ending before we can callback

// todo we should have a park notification similar to park callback

module.exports = circle_integration = {
    parked_callbacks: {},
    parked_notifications: {},
    cached_public_key: null,
    cached_public_key_timestamp: null,

    park_callback: (id, cb) => {
        // whenever we go to park a callback we actually have a race condition where the notification may have already arrived
        // so first we have to check the parked notifications to see if we have a notification already waiting for this callback
        if (circle_integration.parked_notifications.hasOwnProperty(id)) {
            
            // reaching here implies that a notification was already waiting for us, get that notification and remove it from parking
            const parked_notification = circle_integration.parked_notifications[id];
            delete circle_integration.parked_notifications[id];

            // return the notification in the callback
            return cb(null, parked_notification);
        }

        // reaching here implies that no notification was waiting for us already so we go ahead and park this callback
        // once its parked we are done here, the on_notification will pick up the parked callback and call it when ready
        // or in the event of a timeout it will be called back with an error indicating the timeout
        circle_integration.parked_callbacks[id] = cb;
    },

    call_circle: async (accepted_response_codes, method, url, data, cb) => {
        // form request
        const request = {
            method: method,
            url: url,
            headers: {
                'Authorization': `Bearer ${api_sandbox_key}`
            }
        };
        if (data !== null) {
            request.data = data;
        }

        let response;
        try {
            response = await axios(request);
        } catch (request_error) {
            // axios wont return the response normally on error codes, associate it here
            response = request_error.response;
        }

        // get status code
        const status_code = response.status || (response.data.hasOwnProperty('code') ? response.data.code : 999);

        // if our request has an accepted response code
        if (accepted_response_codes.includes(status_code)) {

            // if the body is malformed, return a malformed error
            if (!response.data.hasOwnProperty('data')) {
                return cb({
                    error: {
                        reason: 'server',
                        message: 'Malformed Circle Response'
                    }
                });
            }

            // get the response body from the response
            const response_body = response.data.data;

            // return just the response body
            return cb(null, response_body);
        }

        // reaching here implies we had a bad response, attempt to identify why

        // define failure codes
        const failure_codes = {
            '400': {
                reason: 'server',
                message: 'Bad Request'
            },
            '401': {
                reason: 'server',
                message: 'Unauthorized'
            },
            '404': {
                reason: 'server',
                message: 'Not Found'
            },
            '422': {
                reason: 'server',
                message: 'Unprocessable Entity'
            },
            '429': {
                reason: 'server',
                message: 'Too Many Requests'
            },
            '500': {
                reason: 'server',
                message: 'Unexpected Server Error'
            }
        };

        // check if its an expected error code, returning the relevant error
        if (failure_codes.hasOwnProperty(status_code)) {
            const failure = failure_codes[status_code];
            return cb({
                error: {
                    reason: failure.reason,
                    message: failure.message
                }
            });
        }

        // reaching here implies it was an unexpected error code
        return cb({
            error: {
                reason: 'server',
                message: 'Unknown Server Error'
            }
        });
    },
    
    setup_notifications_subscription: (sns_endpoint_url, cb) => {
        // many calls to circle such as adding a card, or creating a payment can take time to process
        // rather than hammering circle with polling requests they provide an aws sns hook that we can
        // use to listen for all responses when they complete so that we dont need to poll

        // list any existing subscriptions to see if one needs to be created
        circle_integration.call_circle([200], 'get', `${api_uri_base}notifications/subscriptions`, null, (error, existing_subscriptions) => {
            if (error) {
                return error;
            }

            // look through subscriptions to see if we have a fully confirmed one
            for (const existing_subscription of existing_subscriptions) {

                // each subscription is made up of 2 subscriptions, one for east one for west, both need to be good
                let subscription_good = true;
                for (const subscription_detail of existing_subscription.subscriptionDetails) {
                    
                    // if this subscription region is not good move to next subscription
                    if (subscription_detail.status !== 'confirmed') {
                        subscription_good = false;
                        break;
                    }
                }

                // if we got a good subscription we can return without creating one
                if (subscription_good) {
                    return cb(null);
                }
            }

            // reaching here implies we do not have an existing, confirmed, subscription and it must be created

            // create the notification subscription
            const request_body = { 
                endpoint: sns_endpoint_url
            };
            circle_integration.call_circle([200, 201], 'post', `${api_uri_base}notifications/subscriptions`, request_body, (error) => {
                if (error) {
                    return cb(error);
                }
                // creation okay, next step is to wait for confirmation to arrive in `on_notification`
                return cb(null);
            });
        });
    },

    on_notification: async (notification, cb) => {

        // if this is a subscription confirmation
        if (notification.Type === 'SubscriptionConfirmation') {
            const subscribe_url = notification.SubscribeURL;
            const request = {
                method: 'get',
                url: subscribe_url
            };
            try {
                await axios(request);
            } catch (request_error) {
                return cb({
                    error: request_error
                });
            }

            return cb(null);
        }

        // reaching here implies its a notification, get the message
        let parsed_message = null;
        try {
            parsed_message = JSON.parse(notification.Message);
        } catch (parse_error)  {
            return cb(parse_error);
        }

        let result = null;
        switch (parsed_message.notificationType) {
            case 'cards':
                result = parsed_message.card;
                break;

            default:
                return cb({
                    error: {
                        reason: 'server',
                        message: 'Unexpected Notification Type: ' + parsed_message.notificationType,
                        notification: notification
                    }
                });
        }

        // whenever we receive a normal notification (not the confirmation one) we have a race condition, sometimes a callback
        // will already be parked and waiting, and sometimes the callback may not be ready yet, first check if a callback is parked
        if (circle_integration.parked_callbacks.hasOwnProperty(result.id)) {

            // reaching here implies a callback was parked and already waiting for this result, get that callback and remove it from parking
            const parked_callback = circle_integration.parked_callbacks[result.id];
            delete circle_integration.parked_callbacks[result.id];

            // return the result in the callback
            parked_callback(null, result);

            // close sns request success
            return cb(null);
        }

        // reaching here implies that a callback was not already waiting meaning that the notification came before we could park one
        // in this case we park the notification so that when the callback goes to park with park_callback it will see it waiting
        circle_integration.parked_notifications[result.id] = result;

        // close sns request success
        return cb(null);
    },

    get_public_key: (force_refresh, cb) => {
        // circle reccommends caching our public key which changes infrequently for at least 24 hours as per:
        // https://developers.circle.com/reference#getpublickey
        // check if we have a cached copy, and use it if cache is still valid
        // if a public key fails the client can use force refresh, todo or maybe the server detects this, invalidates it and the client calls again?
        const cache_valid = circle_integration.cached_public_key_timestamp !== null && new Date().getTime() - circle_integration.cached_public_key_timestamp <= public_key_cache_duration;
        if (!force_refresh && cache_valid) {
            return cb(null, circle_integration.cached_public_key);
        }

        // if we have no cached key, or the cache has reached expiry, get a new public key from circle
        circle_integration.call_circle([200], 'get', `${api_uri_base}encryption/public`, null, (error, public_key) => {
            if (error) {
                return cb(error);
            }

            // cache new key and record time of cache
            circle_integration.cached_public_key = public_key;
            circle_integration.cached_public_key_timestamp = new Date().getTime();

            // return public key
            return cb(null, public_key);
        });
    },

    list_sale_items: async () => {
        // todo what if we want sale items per user or something? maybe a delegate to get that from integrator

        // return some demo items
        return sale_items;
    },

    purchase: (idempotency_key, key_id, encrypted_card_information, hashed_card_details, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, session_id, ip_address, sale_item_key, cb) => {
        // find sale item
        const sale_item = sale_items.find((search_sale_item) => { return search_sale_item.sale_item_key === sale_item_key; });
        if (sale_item === undefined || sale_item === null) {
            return cb({
                error: {
                    reason: 'server',
                    message: 'Sale Item Not Found',
                }
            });
        }
        
        // create a card for the transaction
        circle_integration.create_card(idempotency_key, key_id, hashed_card_details, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, session_id, ip_address, (error, card_id) => {
            if (error) {
                return cb(error);
            }

            // todo do we get card id here? or can we get redirects?

            // the user provides an idempotency key for adding the card and we create another here for the payment
            const payment_idempotency_key = uuidv4();

            // create a payment for the transaction
            circle_integration.create_payment(payment_idempotency_key, key_id, card_id, encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, (error, payment_result) => {
                if (error) {
                    return cb(error);
                }
                return cb(null, payment_result);
            });
        });
    },

    // todo dont need key id implicit here as a param
    create_card: (idempotency_key, key_id, hashed_card_details, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, session_id, ip_address, cb) => {
        const request_body = {
            idempotencyKey: idempotency_key,
            keyId: encrypted_card_information.keyId,
            encryptedData: encrypted_card_information.encryptedMessage,
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
                email: email,
                phoneNumber: phone_number,
                sessionId: session_id,
                ipAddress: ip_address
            }
        };
        circle_integration.call_circle([201], 'post', `${api_uri_base}cards`, request_body, (error, create_card_result) => {
            if (error) {
                return cb(error);
            }
            circle_integration.assess_create_card_result(create_card_result, (error, card_id) => {
                if (error) {
                    return cb(error);
                }
                // todo record success or failure here for fraud
                return cb(null, card_id);
            });
        });
    },

    assess_create_card_result: (create_card_result, cb) => {
        // todo risk/fraud/errors?

        // check the status of the response
        switch (create_card_result.status) {

            // complete implies that the card was created successfully, we can now return the card id
            case add_card_status_enum.COMPLETE:
                return cb(null, create_card_result.id); // todo is this the id?

            // failed implies ??? todo?
            case add_card_status_enum.FAILED:
                // todo
                console.log(create_card_result);
                return;
            
            // pending implies we will need to wait for an aws sns callback when the add card action resolves
            case add_card_status_enum.PENDING:
                return circle_integration.park_callback(create_card_result.id, (error, create_card_result) => {
                    if (error) {
                        return cb(error);
                    }
                    // assess the new result
                    return circle_integration.assess_create_card_result(create_card_result, cb);
                });
            
            // guardrail against unexpected responses or changing api
            default:
                return cb({
                    error: {
                        reason: 'server',
                        message: 'Unexpected Create Card Status: ' + create_card_result.status,
                        create_card_result: create_card_result
                    }
                });
        }
    },

    // todo key id
    create_payment: (payment_idempotency_key, key_id, card_id, encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, cb) => {
        const request_body = {
            idempotencyKey: payment_idempotency_key,
            keyId: encrypted_card_information.key_id,
            metadata: {
                email: email,
                phoneNumber: phone_number,
                sessionId: session_id,
                ipAddress: ip_address,
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
            encryptedData: encrypted_card_information.encryptedMessage,
            channel: 'todo, what is a channel in this context?'
        };

        // create the payment
        circle_integration.call_circle([201], 'post', `${api_uri_base}payments`, request_body, (error, payment_result) => {
            if (error) {
                return cb(error);
            }

            // determine if the payment outcome, waiting on sns if needed
            circle_integration.assess_payment_result(payment_result, (error, assessed_payment_result) => {
                if (error) {
                    return cb(error);
                }
                // todo record success or failure here for fraud
                return cb(null, assessed_payment_result);
            });
        });
    },

    assess_payment_result: (payment_result, cb) => {
        // assess the purchase risk
        const risk_error = circle_integration.assess_payment_risk(payment_result);
        if (risk_error) {
            return cb(risk_error);
        }

        // check the status
        switch (payment_result.status) {

            // confirmed and paid are equivalent for considering the payment a success, paid just implies its in our wallet now
            case payment_status_enum.CONFIRMED:
            case payment_status_enum.PAID:
                return cb(null, 'todo receipt id?');

            // failed implies that the the payment is complete and will never be successful, figure out what the reason was to
            // determine what we tell the player and if they should retry the payment or not (with a new payment)
            case payment_status_enum.FAILED:
                return circle_integration.assess_payment_failure(payment_result);
            
            // pending means we just need to wait, and continue polling for the result - null here implies pending
            case payment_status_enum.PENDING:
                // todo park here id guess?
                return null;
            
            // action required means the player will need to be redirected to verify payment
            case payment_status_enum.ACTION_REQUIRED:
                return cb(null, {
                    redirect: {
                        redirect_url: result.requiredAction.redirectUrl,
                        success_url: 'todo',
                        failure_url: 'todo'
                    }
                });
            
            // handle unexpected status
            default:
                return cb({
                    error: {
                        reason: 'server',
                        message: 'Unexpected Payment Status: ' + payment_result.status,
                        payment_result: payment_result
                    }
                });
        }
    },

    assess_payment_risk: (payment_result) => {
        // if a risk evaluation is present, along with a decision, and that decision is denied we have failed the payment from risk, determine why
        if (result.hasOwnProperty('riskEvaluation') && result.riskEvalutaion.hasOwnProperty('decision') && result.riskEvalutaion.decision === 'denied') {
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
                    error: {
                        reason: 'server',
                        message: 'Unexpected Risk Code: ' + reason_code,
                        payment_result: payment_result
                    }
                }; 
            }

            // reaching here implies we have a found_risk_category, attempt to find a specific reason
            let found_specific_reason = null;
            for (const specific_reason in found_risk_category.specific_reasons) {
                
                // if the specific reason code matches we found the specific reason
                if (specific_reason.code === reason_code) {
                    found_specific_reason = specific_reason;
                    break;
                }
            }

            // we may or may not have found a specific reason, but the category is all that is gauranteed
            // return whatever we have
            return {
                error: {
                    reason: 'user',
                    message: `code: ${reason_code}: ${found_risk_category.category}: ${found_risk_category.description} (${found_specific_reason === null ? 'no specific reason found' : found_specific_reason.description})`,
                    payment_result: payment_result
                }
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