module.exports = is_purchase_idempotent_equal = (existing_purchase, user_id, sale_item_key, sale_item_price, client_generated_idempotency_key, metadata_hash_email, metadata_hash_phone_number, metadata_hash_session_id, metadata_hash_ip_address, metadata_hash_name_on_card, metadata_hash_city, metadata_hash_country, metadata_hash_district, metadata_hash_address_line_1, metadata_hash_address_line_2, metadata_hash_postal_zip_code, metadata_hash_expiry_month, metadata_hash_expiry_year, metadata_hash_card_number, metadata_hash_card_cvv, metadata_hash_circle_public_key_id) => {
    const is_equal = 
        existing_purchase.user_id                            === user_id &&
        existing_purchase.sale_item_key                      === sale_item_key &&
        existing_purchase.sale_item_price                    === sale_item_price &&
        existing_purchase.client_generated_idempotency_key   === client_generated_idempotency_key &&
        existing_purchase.metadata_hash_email                === metadata_hash_email &&
        existing_purchase.metadata_hash_phone_number         === metadata_hash_phone_number &&
        existing_purchase.metadata_hash_session_id           === metadata_hash_session_id &&
        existing_purchase.metadata_hash_ip_address           === metadata_hash_ip_address &&
        existing_purchase.metadata_hash_name_on_card         === metadata_hash_name_on_card &&
        existing_purchase.metadata_hash_city                 === metadata_hash_city &&
        existing_purchase.metadata_hash_country              === metadata_hash_country &&
        existing_purchase.metadata_hash_district             === metadata_hash_district &&
        existing_purchase.metadata_hash_address_line_1       === metadata_hash_address_line_1 &&
        existing_purchase.metadata_hash_address_line_2       === metadata_hash_address_line_2 &&
        existing_purchase.metadata_hash_postal_zip_code      === metadata_hash_postal_zip_code &&
        existing_purchase.metadata_hash_expiry_month         === metadata_hash_expiry_month &&
        existing_purchase.metadata_hash_expiry_year          === metadata_hash_expiry_year &&
        existing_purchase.metadata_hash_card_number          === metadata_hash_card_number &&
        existing_purchase.metadata_hash_card_cvv             === metadata_hash_card_cvv &&
        existing_purchase.metadata_hash_circle_public_key_id === metadata_hash_circle_public_key_id;
    return is_equal;
};