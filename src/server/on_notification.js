const axios = require('axios').default.create();
const parking = require('./parking.js');

module.exports = on_notification = async (notification, cb) => {
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

        case 'settlements':
            // todo wut?
            result = parsed_message.settlement;
            break;

        default:
            return cb({
                error: 'Unexpected Notification Type'
            });
    }

    // park the notification and dispatch the callback if its available
    return parking.park_notification(result.id, result, (error) => {
        if (error) {
            return cb(error);
        }

        // close sns request success
        return cb(null);
    });
};