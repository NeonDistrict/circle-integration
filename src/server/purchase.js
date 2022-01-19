const { v4: uuidv4 } = require('uuid');
const sale_items = require('./sale_items.dev.js');
// todo these should be passed in like config maybe?
// maybe literally in the config to keep it simple

module.exports = purchase = (
    client_generated_idempotency_key, 
    verification_type, 
    encrypted_card_information, 
    hashed_card_details, 
    name_on_card, 
    city, 
    country, 
    address_line_1, 
    address_line_2, 
    district, 
    postal_zip_code, 
    expiry_month, 
    expiry_year, 
    email, 
    phone_number, 
    session_id, 
    ip_address, 
    sale_item_key, 
    cb
) => {
    // find sale item
    const sale_item = sale_items.find((search_sale_item) => { return search_sale_item.sale_item_key === sale_item_key; });
    if (sale_item === undefined || sale_item === null) {
        return cb({
            error: 'Sale Item Key Not Found'
        });
    }
    
    // generate idempotency keys that go to circle
    // todo thes need to be checked for uniqueness
    const create_card_idempotency_key = uuidv4();
    const payment_idempotency_key = uuidv4();
    // todo payments use multiple idempotency keys 3ds/cvv/unsec

    // create a card for the transaction
    circle_integration_server.create_card(
        create_card_idempotency_key, 
        hashed_card_details, 
        encrypted_card_information, 
        name_on_card, 
        city, 
        country, 
        address_line_1, 
        address_line_2, 
        district, 
        postal_zip_code, 
        expiry_month, 
        expiry_year, 
        email, 
        phone_number, 
        session_id, 
        ip_address, (error, assessed_create_card_result) => {
        if (error) {
            return cb(error);
        }
        
        // create a payment for the transaction
        circle_integration_server.create_payment(
            payment_idempotency_key, 
            verification_type, 
            assessed_create_card_result.id, 
            encrypted_card_information, 
            email, 
            phone_number, 
            session_id, 
            ip_address, 
            sale_item, (error, assessed_payment_result) => {
            if (error) {
                return cb(error);
            }
            return cb(null, assessed_payment_result);
        });
    });
}