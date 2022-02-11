const fatal_error = require('./fatal_error.js');
const create_card_mark_completed = require('./postgres/create_card_mark_completed.js');
const create_card_mark_pending = require('./postgres/create_card_mark_pending.js');
const create_card_status_enum = require('./enum/create_card_status_enum.js');
const assess_create_card_failure = require('./assess_create_card_failure.js');
const parking = require('./parking.js');
const purchase_log = require('./purchase_log.js');

module.exports = assess_create_card_result = async (internal_purchase_id, user_id, create_card_result) => {    
    purchase_log(internal_purchase_id, {
        event: 'assess_create_card_result'
    });
    switch (create_card_result.status) {
        case create_card_status_enum.COMPLETE:
            await create_card_mark_completed(internal_purchase_id, create_card_result.id);
            return create_card_result.id;

        case create_card_status_enum.FAILED:
            return await assess_create_card_failure(internal_purchase_id, user_id, create_card_result);
        
        case create_card_status_enum.PENDING:
            await create_card_mark_pending(internal_purchase_id);
            const create_card_result_from_notification = await new Promise((resolve, reject) => {
                return parking.park_callback(create_card_result.id, (error, create_card_result_from_notification) => {
                    if (error) {
                        return reject(error);
                    }
                    return resolve(create_card_result_from_notification);
                });
            });
            return await assess_create_card_result(internal_purchase_id, user_id, create_card_result_from_notification);

        default:
            return fatal_error({
                error: 'Unexpected Create Card Status: ' + create_card_result.status
            });
    }
};