const fatal_error = require('./fatal_error.js');
const create_card_status_enum = require('./enum/create_card_status_enum.js');
const assess_create_card_failure = require('./assess_create_card_failure.js');
const parking = require('./parking.js');
const purchase_log = require('./purchase_log.js');

module.exports = assess_create_card_result = (config, postgres, internal_purchase_id, user_id, create_card_result, cb) => {    
    purchase_log(internal_purchase_id, {
        event: 'assess_create_card_result'
    });
    switch (create_card_result.status) {
        case create_card_status_enum.COMPLETE:
            return postgres.create_card_mark_completed(internal_purchase_id, create_card_result.id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb(null, create_card_result.id);
            });

        case create_card_status_enum.FAILED:
            return assess_create_card_failure(config, postgres, internal_purchase_id, user_id, create_card_result, cb);
        
        case create_card_status_enum.PENDING:
            return postgres.create_card_mark_pending(internal_purchase_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return parking.park_callback(create_card_result.id, (error, create_card_result) => {
                    if (error) {
                        return cb(error);
                    }
                    return assess_create_card_result(config, postgres, internal_purchase_id, user_id, create_card_result, cb);
                });
            });

        default:
            return fatal_error({
                error: 'Unexpected Create Card Status: ' + create_card_result.status
            });
    }
};