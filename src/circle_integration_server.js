const { v4: uuidv4 } = require('uuid');
const axios = require('axios').default.create();
const risk_categories = require('./enum/risk_categories.js');
const add_card_status_enum = require('./enum/add_card_status_enum.js');
const payment_status_enum = require('./enum/payment_status_enum.js');
const payment_error_enum = require('./enum/payment_error_enum.js');
const api_error_enum = require('./enum/api_error_enum.js');
const verification_types_enum = require('./enum/verification_types_enum.js');
const cvv_verification_status_enum = require('./enum/cvv_verification_status_enum.js');
const three_d_secure_verification_status_enum = require('./enum/three_d_secure_verification_status_enum.js');
const sale_items = require('./sale_items.dev.js');

const api_uri_base = 'https://api-sandbox.circle.com/v1/';
const api_sandbox_key = 'QVBJX0tFWTozZjk5YzRmMDdlZjJlM2RkNjlmNjVmNzk5YjU5YjE2NzowODc0NDVhMzk1NjY3YjU2MWY4OTBjODk1NjVlMTg3Mg==';
const public_key_cache_duration = 1000 * 60 * 60 * 24; // 24 hours

module.exports = create_circle_integration_server = (config) => {
    const circle_integration_server = {
        config: config,
        cleanup_parking_interval: null,
        parked_callbacks: {},
        parked_notifications: {},
        cached_public_key: null,
        cached_public_key_timestamp: null,

        shutdown: () => {
            clearInterval(circle_integration_server.cleanup_parking_interval);
        },

        cleanup_parking: () => {
            // todo
        },

        park_callback: (id, cb) => {
            // whenever we go to park a callback we actually have a race condition where the notification may have already arrived
            // so first we have to check the parked notifications to see if we have a notification already waiting for this callback
            if (circle_integration_server.parked_notifications.hasOwnProperty(id)) {
                
                // reaching here implies that a notification was already waiting for us, get that notification and remove it from parking
                const parked_notification = circle_integration_server.parked_notifications[id];
                delete circle_integration_server.parked_notifications[id];

                // return the notification in the callback
                return cb(null, parked_notification.result);
            }

            // reaching here implies that no notification was waiting for us already so we go ahead and park this callback
            // once its parked we are done here, the on_notification will pick up the parked callback and call it when ready
            // or in the event of a timeout it will be called back with an error indicating the timeout
            circle_integration_server.parked_callbacks[id] = {
                callback: cb,
                parked_at: new Date().getTime()
            };
        },

        park_notification: (id, result, cb) => {
            // whenever we receive a normal notification (not the confirmation one) we have a race condition, sometimes a callback
            // will already be parked and waiting, and sometimes the callback may not be ready yet, first check if a callback is parked
            if (circle_integration_server.parked_callbacks.hasOwnProperty(id)) {

                // reaching here implies a callback was parked and already waiting for this result, get that callback and remove it from parking
                const parked_callback = circle_integration_server.parked_callbacks[id];
                delete circle_integration_server.parked_callbacks[id];

                // return the result in the callback
                parked_callback.callback(null, result);

                // handled ok
                return cb(null);
            }

            // reaching here implies that a callback was not already waiting meaning that the notification came before we could park one
            // in this case we park the notification so that when the callback goes to park with park_callback it will see it waiting
            circle_integration_server.parked_notifications[id] = {
                result: result,
                parked_at: new Date().getTime()
            };

            // handled ok
            return cb(null);
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
                        error: 'Malformed Circle Response'
                    });
                }

                // get the response body from the response
                const response_body = response.data.data;

                // return just the response body
                return cb(null, response_body);
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
                        return cb({
                            error: 'Server Error'
                        });
                    case api_error_enum.ACCOUNT_NUMBER_INVALID:
                    case api_error_enum.LAST_NAME_REQUIRED:     
                    case api_error_enum.INVALID_COUNTRY_FORMAT:
                    case api_error_enum.INVALID_DISTRICT_FORMAT:       
                    case api_error_enum.INVALID_BIN_RANGE:        
                    case api_error_enum.INVALID_CARD_NUMBER:  
                    case api_error_enum.ADDITIONAL_BANK_DETAILS_REQUIRED:        
                    case api_error_enum.ADDITIONAL_BILLING_DETAILS_REQUIRED:   
                        // note: some of these may be wire or transfer only, but we report them all with the generic invalid details anyways
                        return cb({
                            error: 'Invalid Details (Correct Information)'
                        });
                    case api_error_enum.INVALID_ENTITY:
                        // note: invalid entity comes back for public key failure or just bad fields, but we only get this message for bad pk
                        if (response.data.hasOwnProperty('message') && response.data.message === 'Request body contains unprocessable entity.') {
                            return cb({
                                error: 'Public Key Failure'
                            }); 
                        } else {
                            return cb({
                                error: 'Invalid Details (Correct Information)'
                            });
                        }
                    case api_error_enum.PUBLIC_KEY_ID_NOT_FOUND:
                        return cb({
                            error: 'Public Key Failure'
                        });
                    case api_error_enum.IDEMPOTENCY_KEY_ALREADY_USED: 
                        return cb({
                            error: 'Idempotency Key Already Used'
                        });
                    case api_error_enum.PAYMENT_NOT_FOUND:        
                        return cb({
                            error: 'Payment Not Found'
                        });
                    case api_error_enum.PAYMENT_EXCEEDS_MERCHANT_LIMIT:
                        // note: this could be that a payment is too small, too large, or beyond a daily/weekly/monthly limit
                        return cb({
                            error: 'Payment Exceeds Merchant Limit'
                        });
                    case api_error_enum.CANNOT_BE_CANCELLED:  
                        return cb({
                            error: 'Cannot Cancel'
                        });
                    case api_error_enum.CANNOT_BE_REFUNDED:
                        return cb({
                            error: 'Cannot Refund'
                        });      
                    case api_error_enum.ALREADY_CANCELLED:
                        return cb({
                            error: 'Already Canceled'
                        });
                    case api_error_enum.REFUND_EXCEEDS_PAYMENT:
                        return cb({
                            error: 'Refund Exceeds Payment'
                        });     
                    case api_error_enum.ORIGINAL_PAYMENT_FAILED:        
                        // note: this happens when we try to refund or cancel a payment that was originally failed, and cannot be refunded or cancelled
                        return cb({
                            error: 'Payment Was Failed'
                        });
                    case api_error_enum.UNSUPPORTED_COUNTRY:        
                        return cb({
                            error: 'Unsupported Country'
                        });         
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
                return cb({
                    error: failure
                });
            }

            // reaching here implies it was an unexpected error code
            return cb({
                error: 'Unknown Status Code Error'
            });
        },
        
        setup_notifications_subscription: (sns_endpoint_url, cb) => {
            // many calls to circle such as adding a card, or creating a payment can take time to process
            // rather than hammering circle with polling requests they provide an aws sns hook that we can
            // use to listen for all responses when they complete so that we dont need to poll

            // list any existing subscriptions to see if one needs to be created
            circle_integration_server.call_circle([200], 'get', `${api_uri_base}notifications/subscriptions`, null, (error, existing_subscriptions) => {
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
                circle_integration_server.call_circle([200, 201], 'post', `${api_uri_base}notifications/subscriptions`, request_body, (error) => {
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
                
                case 'payments':
                    result = parsed_message.payment;
                    break;

                default:
                    return cb({
                        error: 'Unexpected Notification Type'
                    });
            }

            // park the notification and dispatch the callback if its available
            return circle_integration_server.park_notification(result.id, result, (error) => {
                if (error) {
                    return cb(error);
                }

                // close sns request success
                return cb(null);
            });
        },

        get_public_key: (force_refresh, cb) => {
            // circle reccommends caching our public key which changes infrequently for at least 24 hours as per:
            // https://developers.circle.com/reference#getpublickey
            // check if we have a cached copy, and use it if cache is still valid
            // if a public key fails the client can use force refresh, todo or maybe the server detects this, invalidates it and the client calls again?
            const cache_valid = circle_integration_server.cached_public_key_timestamp !== null && new Date().getTime() - circle_integration_server.cached_public_key_timestamp <= public_key_cache_duration;
            if (!force_refresh && cache_valid) {
                return cb(null, circle_integration_server.cached_public_key);
            }

            // if we have no cached key, or the cache has reached expiry, get a new public key from circle
            circle_integration_server.call_circle([200], 'get', `${api_uri_base}encryption/public`, null, (error, public_key) => {
                if (error) {
                    return cb(error);
                }

                // cache new key and record time of cache
                circle_integration_server.cached_public_key = public_key;
                circle_integration_server.cached_public_key_timestamp = new Date().getTime();

                // return public key
                return cb(null, public_key);
            });
        },

        list_sale_items: async () => {
            // todo what if we want sale items per user or something? maybe a delegate to get that from integrator

            // return some demo items
            return sale_items;
        },

        purchase: (idempotency_key, verification_type, encrypted_card_information, hashed_card_details, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, session_id, ip_address, sale_item_key, cb) => {
            // find sale item
            const sale_item = sale_items.find((search_sale_item) => { return search_sale_item.sale_item_key === sale_item_key; });
            if (sale_item === undefined || sale_item === null) {
                return cb({
                    error: 'Sale Item Key Not Found'
                });
            }
            
            // create a card for the transaction
            circle_integration_server.create_card(idempotency_key, hashed_card_details, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, session_id, ip_address, (error, assessed_create_card_result) => {
                if (error) {
                    return cb(error);
                }

                // todo do we get card id here? or can we get redirects? i dont think redirs here

                // the user provides an idempotency key for adding the card and we create another here for the payment
                const payment_idempotency_key = uuidv4();

                // create a payment for the transaction
                circle_integration_server.create_payment(payment_idempotency_key, verification_type, assessed_create_card_result.id, encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, (error, assessed_payment_result) => {
                    if (error) {
                        return cb(error);
                    }
                    return cb(null, assessed_payment_result);
                });
            });
        },

        create_card: (idempotency_key, hashed_card_details, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, session_id, ip_address, cb) => {
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
            circle_integration_server.call_circle([201], 'post', `${api_uri_base}cards`, request_body, (error, create_card_result) => {
                if (error) {
                    return cb(error);
                }
                circle_integration_server.assess_create_card_result(create_card_result, (error, card_id) => {
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
                    return cb(null, create_card_result); // todo is this the id?

                // failed implies ??? todo?
                case add_card_status_enum.FAILED:
                    // todo
                    console.log(create_card_result);
                    return;
                
                // pending implies we will need to wait for an aws sns callback when the add card action resolves
                case add_card_status_enum.PENDING:
                    return circle_integration_server.park_callback(create_card_result.id, (error, create_card_result) => {
                        if (error) {
                            return cb(error);
                        }
                        // assess the new result
                        return circle_integration_server.assess_create_card_result(create_card_result, cb);
                    });
                
                // guardrail against unexpected responses or changing api
                default:
                    return cb({
                        error: 'Unexpected Create Card Status'
                    });
            }
        },

        create_payment: (payment_idempotency_key, verification_type, card_id, encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, cb) => {
            const request_body = {
                idempotencyKey: payment_idempotency_key,
                keyId: encrypted_card_information.keyId,
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
                verification: verification_type,
                verificationSuccessUrl: config.three_d_secure_success_url,
                verificationFailureUrl: config.three_d_secure_failure_url,
                source: {
                    id: card_id,
                    type: 'card'
                },
                description: sale_item.statement_description,
                encryptedData: encrypted_card_information.encryptedMessage
            };

            // create the payment
            circle_integration_server.call_circle([201], 'post', `${api_uri_base}payments`, request_body, (error, payment_result) => {
                if (error) {
                    return cb(error);
                }

                // determine the payment outcome, waiting on sns if needed
                circle_integration_server.assess_payment_result(payment_result, (error, assessed_payment_result) => {
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
            const risk_error = circle_integration_server.assess_payment_risk(payment_result);
            if (risk_error) {
                return cb(risk_error);
            }

            // check the status
            switch (payment_result.status) {

                // confirmed and paid are equivalent for considering the payment a success, paid just implies its in our wallet now
                case payment_status_enum.CONFIRMED:
                case payment_status_enum.PAID:
                    return cb(null, payment_result);

                // failed implies that the the payment is complete and will never be successful, figure out what the reason was to
                // determine what we tell the player and if they should retry the payment or not (with a new payment)
                case payment_status_enum.FAILED:
                    return circle_integration_server.assess_payment_failure(payment_result, cb);
                
                // pending implies we will need to wait for an aws sns callback when the payment action resolves
                case payment_status_enum.PENDING:
                    return circle_integration_server.park_callback(payment_result.id, (error, payment_result) => {
                        if (error) {
                            return cb(error);
                        }
                        // assess the new result
                        return circle_integration_server.assess_payment_result(payment_result, cb);
                    });
                
                // action required means the player will need to be redirected to verify payment
                case payment_status_enum.ACTION_REQUIRED:
                    return cb(null, {
                        redirect: payment_result.requiredAction.redirectUrl
                    });
                
                // handle unexpected status
                default:
                    return cb({
                        error: 'Unexpected Payment Status'
                    });
            }
        },

        assess_payment_risk: (payment_result) => {
            // if a risk evaluation is present, along with a decision, and that decision is denied we have failed the payment from risk, determine why
            if (payment_result.hasOwnProperty('riskEvaluation') && payment_result.riskEvalutaion.hasOwnProperty('decision') && payment_result.riskEvalutaion.decision === 'denied') {
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
                        error: 'Unexpected Risk Code'
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
                let description = null;
                if (found_specific_reason === null) {
                    description = found_risk_category.description;
                } else {
                    description = found_specific_reason.description;
                }
                return {
                    error: `${reason_code} ${found_risk_category.category}: ${description}`,
                };

            // reaching here implies there was no risk evaluation, or nested decision, or the decision was not denied, meaning no risk, return null to inidicate no risk
            } else {
                return null;
            }
        },

        assess_payment_failure: (payment_result, cb) => {
            switch (payment_result.errorCode) {
                case payment_error_enum.PAYMENT_FAILED:
                case payment_error_enum.VERIFICATION_FAILED:
                    return cb({
                        error: 'Payment Failed (Unspecified)'
                    });
                case payment_error_enum.PAYMENT_FRAUD_DETECTED:
                case payment_error_enum.VERIFICATION_FRAUD_DETECTED:
                    return cb({
                        error: 'Fraud Detected (Contact Card Provider)'
                    });
                case payment_error_enum.PAYMENT_DENIED:
                case payment_error_enum.RISK_DENIED:
                case payment_error_enum.VERIFICATION_NOT_SUPPORTED_BY_ISSUER:
                case payment_error_enum.THREE_D_SECURE_FAILURE:
                    return cb({
                        error: 'Payment Denied (Contact Card Provider)'
                    });
                case payment_error_enum.PAYMENT_NOT_SUPPORTED_BY_ISSUER:
                case payment_error_enum.CARD_NETWORK_UNSUPPORTED:
                    return cb({
                        error: 'Payment Not Supported (Contact Card Provider)'
                    });
                case payment_error_enum.PAYMENT_NOT_FUNDED:
                    return cb({
                        error: 'Insufficient Funds (Contact Card Provider)'
                    });
                case payment_error_enum.PAYMENT_STOPPED_BY_ISSUER:
                case payment_error_enum.VERIFICATION_STOPPED_BY_ISSUER:
                    return cb({
                        error: 'Payment Stopped (Contact Card Provider)'
                    });
                case payment_error_enum.UNAUTHORIZED_TRANSACTION:
                    return cb({
                        error: 'Payment Unauthorized (Contact Card Provider)'
                    });
                case payment_error_enum.CARD_INVALID:
                case payment_error_enum.INVALID_ACCOUNT_NUMBER:
                case payment_error_enum.CARD_CVV_INVALID:
                case payment_error_enum.CARD_ADDRESS_MISMATCH:
                case payment_error_enum.CARD_ZIP_MISMATCH:
                case payment_error_enum.CARD_CVV_REQUIRED:
                case payment_error_enum.CARD_FAILED:
                    return cb({
                        error: 'Invalid Details (Correct Information)'
                    });
                case payment_error_enum.CARD_EXPIRED:
                    return cb({
                        error: 'Card Expired'
                    });
                case payment_error_enum.CARD_LIMIT_VIOLATED:
                    return cb({
                        error: 'Limit Exceeded (Circle Limit)'
                    });
                case payment_error_enum.CARD_NOT_HONORED:
                    return cb({
                        error: 'Card Not Honored (Contact Card Provider)'
                    });
                case payment_error_enum.CREDIT_CARD_NOT_ALLOWED:
                    return cb({
                        error: 'Card Not Allowed (Contact Card Provider)'
                    });
                case payment_error_enum.CARD_ACCOUNT_INELIGIBLE:
                case payment_error_enum.BANK_ACCOUNT_INELIGIBLE:
                    return cb({
                        error: 'Ineligible Account (Contact Card Provider)'
                    });
                case payment_error_enum.PAYMENT_FAILED_BALANCE_CHECK:
                    return cb({
                        error: 'Insufficient Balance (Contact Card Provider)'
                    });
                case payment_error_enum.BANK_TRANSACTION_ERROR:
                    return cb({
                        error: 'Bank Transaction Error (Contact Card Provider)'
                    });
                case payment_error_enum.PAYMENT_CANCELED:
                    return cb({
                        error: 'Payment Cancelled'
                    });
                case payment_error_enum.PAYMENT_UNPROCESSABLE:
                    return cb({
                        error: 'Public Key Failure'
                    });
                case payment_error_enum.THREE_D_SECURE_NOT_SUPPORTED:
                    return cb({
                        error: '3DSecure Not Supported'
                    });
                case payment_error_enum.THREE_D_SECURE_ACTION_EXPIRED:
                    return cb({
                        error: '3DSecure Expired'
                    });
                case payment_error_enum.PAYMENT_RETURNED:               // todo: this is a different case entirely, how to handle this?
                case payment_error_enum.INVALID_WIRE_RTN:               // note: we do not do wires
                case payment_error_enum.INVALID_ACH_RTN:                // note: we do not do ach payments
                case payment_error_enum.CHANNEL_INVALID:                // note: we do not use the channels function of circle
                case payment_error_enum.THREE_D_SECURE_REQUIRED:        // note: we start with 3dsecure then step down to cvv if not available. if this error occurs someone is doing something they shouldnt
                case payment_error_enum.THREE_D_SECURE_INVALID_REQUEST: // note: this means we sent bad params, which should never happen. if this error occurs someone is doing something they shouldnt
                default:
                    // todo these cant happen, a dev should be notified
                    return cb({
                        error: 'Server Error'
                    });
            }
        },

        get_payment: (payment_id) => {

        },

        purchase_history: async (user_id) => {

        }
    };
    circle_integration_server.cleanup_parking_interval = setInterval(circle_integration_server.cleanup_parking, 5000);
    return circle_integration_server;
};