const create_payment_3ds = require('./create_payment_3ds.js');
const create_payment_cvv = require('./create_payment_cvv.js');
const create_payment_unsecure = require('./create_payment_unsecure.js');

module.exports = create_payment = (internal_purchase_id, card_id, encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, cb) => {
    create_payment_3ds(internal_purchase_id, card_id, encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, (error, assessment) => {
        if (error) {
            return cb(error);
        }
        if (assessment.hasOwnProperty('redirect')) {
            return cb(null, assessment);
        }
        if (assessment.hasOwnProperty('payment_id')) {
            return cb(null, assessment);
        }
        if (!assessment.hasOwnProperty('unavailable')) {
            return cb({
                error: 'Expected Unavailable Payment 3DS'
            });
        }
        create_payment_cvv(internal_purchase_id, card_id, encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, (error, assessment) => {
            if (error) {
                return cb(error);
            }
            if (assessment.hasOwnProperty('payment_id')) {
                return cb(null, assessment);
            }
            if (!assessment.hasOwnProperty('unavailable')) {
                return cb({
                    error: 'Expected Unavailable Payment CVV'
                });
            }
            create_payment_unsecure(internal_purchase_id, card_id, encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, (error, assessment) => {
                if (error) {
                    return cb(error);
                }
                if (assessment.hasOwnProperty('payment_id')) {
                    return cb(null, assessment);
                }
                return cb({
                    error: 'Unexpected Resolution Payment Unsecure'
                });
            });
        });
    });
};