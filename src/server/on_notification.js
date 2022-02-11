const axios = require('axios').default.create();
const parking = require('./parking.js');

module.exports = on_notification = async (notification) => {
    // if this is a subscription confirmation
    if (notification.Type === 'SubscriptionConfirmation') {
        console.log('got subscription confirmation');
        const subscribe_url = notification.SubscribeURL;
        const request = {
            method: 'get',
            url: subscribe_url
        };
        console.log('confirming subscription');
        await axios(request);
        console.log('subscription confirmed');
        return cb(null);
    }

    // reaching here implies its a notification, get the message
    const parsed_message = JSON.parse(notification.Message);

    let result = null;
    switch (parsed_message.notificationType) {
        case 'cards':
            result = parsed_message.card;
            break;
        
        case 'payments':
            result = parsed_message.payment;
            break;

        case 'settlements':
            // todo wut?
            result = parsed_message.settlement;
            break;

        default:
            throw new Error('Unexpected Notification Type: ' + parsed_message.notificationType);
    }

    // park the notification and dispatch the callback if its available
    parking.park_notification(result.id, result);
};