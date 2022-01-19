const add_card_status_enum = require('./enum/add_card_status_enum.js');
const parking = require('./parking.js');

module.exports = assess_create_card_result = (create_card_result, cb) => {
    // todo risk/fraud/errors?

    // check the status of the response
    switch (create_card_result.status) {

        // complete implies that the card was created successfully, we can now return the card id
        case add_card_status_enum.COMPLETE:
            return cb(null, create_card_result); // todo is this the id?

        // failed implies ??? todo?
        case add_card_status_enum.FAILED:
            // todo
            console.log(create_card_result);
            return;
        
        // pending implies we will need to wait for an aws sns callback when the add card action resolves
        case add_card_status_enum.PENDING:
            return parking.park_callback(create_card_result.id, (error, create_card_result) => {
                if (error) {
                    return cb(error);
                }
                // assess the new result
                return assess_create_card_result(create_card_result, cb);
            });
        
        // guardrail against unexpected responses or changing api
        default:
            return cb({
                error: 'Unexpected Create Card Status'
            });
    }
};