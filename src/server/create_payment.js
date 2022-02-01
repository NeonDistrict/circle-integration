const fatal_error = require('./fatal_error.js');
const create_payment_3ds = require('./create_payment_3ds.js');
const create_payment_cvv = require('./create_payment_cvv.js');
const create_payment_unsecure = require('./create_payment_unsecure.js');
const purchase_log = require('./purchase_log.js');

module.exports = create_payment = (config, postgres, internal_purchase_id, user_id, card_id, circle_public_key_id, encrypted_card_information, email, phone_number, metadata_hash_session_id, ip_address, sale_item, cb) => {
    purchase_log(internal_purchase_id, {
        event: 'create_payment'
    });
    create_payment_3ds(config, postgres, internal_purchase_id, user_id, card_id, circle_public_key_id, encrypted_card_information, email, phone_number, metadata_hash_session_id, ip_address, sale_item, (error, assessment) => {
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
            return fatal_error({
                error: 'Expected Unavailable Payment 3DS'
            });
        }
        create_payment_cvv(config, postgres, internal_purchase_id, user_id, card_id, circle_public_key_id, encrypted_card_information, email, phone_number, metadata_hash_session_id, ip_address, sale_item, (error, assessment) => {
            if (error) {
                return cb(error);
            }
            if (assessment.hasOwnProperty('payment_id')) {
                return cb(null, assessment);
            }
            if (!assessment.hasOwnProperty('unavailable')) {
                return fatal_error({
                    error: 'Expected Unavailable Payment CVV'
                });
            }
            create_payment_unsecure(config, postgres, internal_purchase_id, user_id, card_id, circle_public_key_id, encrypted_card_information, email, phone_number, metadata_hash_session_id, ip_address, sale_item, (error, assessment) => {
                if (error) {
                    return cb(error);
                }
                if (assessment.hasOwnProperty('payment_id')) {
                    return cb(null, assessment);
                }
                return fatal_error({
                    error: 'Unexpected Resolution Payment Unsecure'
                });
            });
        });
    });
};