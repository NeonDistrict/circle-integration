const log = require('../utilities/log.js');
const call_circle = require('./call_circle.js');

module.exports = async (sns_endpoint_url) => {
    log({
        event: 'setting up aws sns subscription', 
        sns_endpoint_url: sns_endpoint_url
    });
    try {
        // many calls to circle such as adding a card, or creating a payment can take time to process
        // rather than hammering circle with polling requests they provide an aws sns hook that we can
        // use to listen for all responses when they complete so that we dont need to poll

        // list any existing subscriptions to see if one needs to be created
        log({
            event: 'getting existing aws sns subscriptions'
        });
        const existing_subscriptions = await call_circle('none', [200], 'get', `/notifications/subscriptions`, null);
        
        log({
            event: 'got existing aws sns subscriptions',
            existing_subscriptions: existing_subscriptions
        });

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
                log({
                    event: 'aws sns subscription was already in place'
                });
                return;
            }
        }

        // reaching here implies we do not have an existing, confirmed, subscription and it must be created
        log({
            event: 'aws sns subscription must be created'
        });

        // create the notification subscription
        const request_body = { 
            endpoint: sns_endpoint_url
        };
        log({
            event: 'creating aws sns subscription'
        });
        await call_circle(null, [200, 201], 'post', `/notifications/subscriptions`, request_body);
        log({
            event: 'created aws sns subscription'
        });
        // creation okay, next step is to wait for confirmation to arrive in `on_notification`
        return;
    } catch (error) {
        log({
            event: 'aws sns subscription setup error',
            error: error.message,
            stack: error.stack
        }, true);
        throw new Error('Internal Server Error');
    }
};