const call_circle = require('./call_circle.js');

module.exports = setup_notification_subscription = (config, sns_endpoint_url, cb) => {
    // many calls to circle such as adding a card, or creating a payment can take time to process
    // rather than hammering circle with polling requests they provide an aws sns hook that we can
    // use to listen for all responses when they complete so that we dont need to poll

    // list any existing subscriptions to see if one needs to be created
    call_circle([200], 'get', `${config.api_uri_base}notifications/subscriptions`, null, (error, existing_subscriptions) => {
        if (error) {
            return cb(error);
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
        call_circle([200, 201], 'post', `${config.api_uri_base}notifications/subscriptions`, request_body, (error) => {
            if (error) {
                return cb(error);
            }
            // creation okay, next step is to wait for confirmation to arrive in `on_notification`
            return cb(null);
        });
    });
};