const log = require('../../utilities/log.js');
const axios = require('axios').default.create();
const parking = require('../../utilities/parking.js');
const sns_validator = new (require('sns-validator'))();
sns_validator.encoding = 'utf8';

module.exports = async (body) => {
    await new Promise((resolve, reject) => {
        sns_validator.validate(body, (error) => {
            if (error) {
                log({
                    event: 'aws sns notification failed verification', 
                    body: body
                }, true);
                return reject(error);
            }
            log({
                event: 'aws sns notification passed verification', 
                body: body
            });
            return resolve();
        });
    });

    // if this is a subscription confirmation
    if (body.Type === 'SubscriptionConfirmation') {
        const subscribe_url = body.SubscribeURL;
        const request = {
            method: 'get',
            url: subscribe_url
        };
        log({
            event: 'aws sns confirming subscription', 
            request: request
        });
        await axios(request);
        return null;
    }

    // reaching here implies its a body, get the message
    const parsed_message = JSON.parse(body.Message);

    let result = null;
    switch (parsed_message.notificationType) {
        case 'cards':
            result = parsed_message.card;
            log({
                event: 'aws sns notification handled', 
                notification_type: 'cards', 
                result: result
            });
            break;
        
        case 'payments':
            result = parsed_message.payment;
            log({
                event: 'aws sns notification handled', 
                notification_type: 'payments', 
                result: result
            });
            break;

        case 'settlements':
            result = parsed_message.settlement;
            log({
                event: 'aws sns notification handled', 
                notification_type: 'settlements', 
                result: result
            });
            return; // we dont do anything with settlements so dont park these

        default:
            log({
                event: 'aws sns notification unexpected type',
                notification_type: parsed_message.notificationType,
                parsed_message: parsed_message
            }, true);
            throw new Error('Internal Server Error');
    }

    // park the body and dispatch the callback if its available
    parking.park_notification(result.id, result);
};