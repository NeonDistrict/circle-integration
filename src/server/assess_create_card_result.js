const add_card_status_enum = require('./enum/add_card_status_enum.js');
const parking = require('./parking.js');
const postgres = require('./postgres/postgres.js');

module.exports = assess_create_card_result = (internal_purchase_id, create_card_result, cb) => {
    const create_card_id = assess_create_card_result.id; // todo is this the id?
    
    // todo risk/fraud/errors?
    // todo risk may come back under failed and can go in there

    // check the status of the response
    switch (create_card_result.status) {

        // complete implies that the card was created successfully, we can now return the card id
        case add_card_status_enum.COMPLETE:
            return postgres.create_card_mark_completed(internal_purchase_id, create_card_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return cb(null, create_card_id);
            });

        // failed implies ??? todo?
        case add_card_status_enum.FAILED:
            // todo
            // todo there should be some postgres calls in here for marking failed
            console.log(create_card_result);
            return;
        
        // pending implies we will need to wait for an aws sns callback when the add card action resolves
        case add_card_status_enum.PENDING:
            return postgres.create_card_mark_pending(internal_purchase_id, create_card_id, (error) => {
                if (error) {
                    return cb(error);
                }
                return parking.park_callback(create_card_result.id, (error, create_card_result) => {
                    if (error) {
                        return cb(error);
                    }
                    // assess the new result
                    return assess_create_card_result(create_card_result, cb);
                });
            });

        // guardrail against unexpected responses or changing api
        default:
            return cb({
                error: 'Unexpected Create Card Status'
            });
    }
};