const fatal_error = require('./fatal_error.js');
const call_circle = require('./call_circle.js');

module.exports = setup_notification_subscription = async (sns_endpoint_url) => {
    try {
        // many calls to circle such as adding a card, or creating a payment can take time to process
        // rather than hammering circle with polling requests they provide an aws sns hook that we can
        // use to listen for all responses when they complete so that we dont need to poll

        // list any existing subscriptions to see if one needs to be created
        console.log('get existing subscriptions');
        const existing_subscriptions = await call_circle([200], 'get', `/notifications/subscriptions`, null);
        console.log('got existing subscriptions');

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
                console.log('subscription in place');
                return;
            }
        }

        // reaching here implies we do not have an existing, confirmed, subscription and it must be created
        console.log('subscription needed');

        // create the notification subscription
        const request_body = { 
            endpoint: sns_endpoint_url
        };
        console.log('create subscription');
        await call_circle([200, 201], 'post', `/notifications/subscriptions`, request_body);
        console.log('create sent okay');
        // creation okay, next step is to wait for confirmation to arrive in `on_notification`
        return;
    } catch (error) {
        return fatal_error({
            error: 'Setup Notifications Subscription Threw Error',
            details: error
        });
    }
};