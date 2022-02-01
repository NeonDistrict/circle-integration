const purchase_log = require('./purchase_log');

module.exports = assess_existing_purchase_result = (internal_purchase_id, existing_purchase, cb) => {
    purchase_log(internal_purchase_id, {
        event: 'assess_existing_purchase_result'
    });
    
    // todo
    // todo if this is a 3d secure pending user action this purchase is considered
    // abandoned and should be marked as abandoned in the database
    return cb({
        error: 'NI'
    });
};