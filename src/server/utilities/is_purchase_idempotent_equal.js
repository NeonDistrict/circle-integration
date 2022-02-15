module.exports = is_purchase_idempotent_equal = (existing_purchase, request_purchase, metadata) => {
    const is_equal = 
        existing_purchase.user_id                            === request_purchase.user_id &&
        existing_purchase.sale_item_key                      === request_purchase.sale_item_key &&
        existing_purchase.client_generated_idempotency_key   === client_generated_idempotency_key &&
        existing_purchase.metadata_hash_email                === metadata.email &&
        existing_purchase.metadata_hash_phone_number         === metadata.phone_number &&
        existing_purchase.metadata_hash_session_id           === metadata.session_id &&
        existing_purchase.metadata_hash_ip_address           === metadata.ip_address &&
        existing_purchase.metadata_hash_name_on_card         === metadata.name_on_card &&
        existing_purchase.metadata_hash_city                 === metadata.city &&
        existing_purchase.metadata_hash_country              === metadata.country &&
        existing_purchase.metadata_hash_district             === metadata.district &&
        existing_purchase.metadata_hash_address_line_1       === metadata.address_line_1 &&
        existing_purchase.metadata_hash_address_line_2       === metadata.address_line_2 &&
        existing_purchase.metadata_hash_postal_zip_code      === metadata.postal_zip_code &&
        existing_purchase.metadata_hash_expiry_month         === metadata.expiry_month &&
        existing_purchase.metadata_hash_expiry_year          === metadata.expiry_year &&
        existing_purchase.metadata_hash_card_number          === metadata.card_number &&
        existing_purchase.metadata_hash_card_cvv             === metadata.card_cvv &&
        existing_purchase.metadata_hash_circle_public_key_id === metadata.circle_public_key_id;
    return is_equal;
};