const fatal_error = require('./fatal_error.js');
const add_card_status_enum = require('./enum/add_card_status_enum.js');
const parking = require('./parking.js');

module.exports = assess_create_card_result = (config, postgres, user_id, internal_purchase_id, create_card_result, cb) => {    
    // todo risk/fraud/errors?
    // todo risk may come back under failed and can go in there

    switch (create_card_result.status) {
        case add_card_status_enum.COMPLETE:
            return postgres.create_card_mark_completed(internal_purchase_id, create_card_result.id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb(null, create_card_result.id);
            });

        case add_card_status_enum.FAILED:
            return postgres.create_card_mark_failed(internal_purchase_id, create_card_result.id, (error) => {
                if (error) {
                    return cb(error);
                }
                // todo we should assess the failure reason here and generate an error
                return cb({
                    error: 'TODO THIS IS NOT COMPLETED'
                })
            });
        
        case add_card_status_enum.PENDING:
            return postgres.create_card_mark_pending(internal_purchase_id, create_card_result.id, (error) => {
                if (error) {
                    return cb(error);
                }
                return parking.park_callback(create_card_result.id, (error, create_card_result) => {
                    if (error) {
                        return cb(error);
                    }
                    return assess_create_card_result(postgres, internal_purchase_id, create_card_result, cb);
                });
            });

        default:
            return fatal_error({
                error: 'Unexpected Create Card Status: ' + create_card_result.status
            });
    }
};