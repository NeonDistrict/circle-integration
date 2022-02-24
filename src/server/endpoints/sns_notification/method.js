const axios = require('axios').default.create();
const parking = require('../../utilities/parking.js');
const sns_validator = new (require('sns-validator'))();
sns_validator.encoding = 'utf8';

module.exports = async (body) => {
    await new Promise((resolve, reject) => {
        sns_validator.validate(body, (error) => {
            if (error) {
                return reject(error);
            }
            return resolve();
        });
    });

    // if this is a subscription confirmation
    if (body.Type === 'SubscriptionConfirmation') {
        console.log('got subscription confirmation');
        const subscribe_url = body.SubscribeURL;
        const request = {
            method: 'get',
            url: subscribe_url
        };
        console.log('confirming subscription');
        await axios(request);
        console.log('subscription confirmed');
        return null;
    }

    // reaching here implies its a body, get the message
    const parsed_message = JSON.parse(body.Message);

    let result = null;
    switch (parsed_message.bodyType) {
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
            throw new Error('Unexpected body Type: ' + parsed_message.bodyType);
    }

    // park the body and dispatch the callback if its available
    parking.park_body(result.id, result);
};