module.exports = assess_existing_purchase_result = (existing_purchase, cb) => {
    // todo
    // todo if this is a 3d secure pending user action this purchase is considered
    // abandoned and should be marked as abandoned in the database
    return cb({
        error: 'NI'
    });
};