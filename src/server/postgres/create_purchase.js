const postgres = require('./postgres.js');
const validate_sale_item_key = require('../validation/validate_sale_item_key.js');
const validate_sale_item_price = require('../validation/validate_sale_item_price.js');
const validate_uuid = require('../validation/validate_uuid.js');
const validate_sha512_hex = require('../validation/validate_sha512_hex.js');
const validate_sha1_hex = require('../validation/validate_sha1_hex.js');
const expect_one_row_count = require('./expect_one_row_count.js');
const purchase_log = require('../purchase_log.js');

module.exports = create_purchase = async (internal_purchase_id, user_id, sale_item_key, sale_item_price, client_generated_idempotency_key, metadata_hash_email, metadata_hash_phone_number, metadata_hash_session_id, metadata_hash_ip_address, metadata_hash_name_on_card, metadata_hash_city, metadata_hash_country, metadata_hash_district, metadata_hash_address_line_1, metadata_hash_address_line_2, metadata_hash_postal_zip_code, metadata_hash_expiry_month, metadata_hash_expiry_year, metadata_hash_card_number, metadata_hash_circle_public_key_id) => {
    purchase_log(internal_purchase_id, {
        event: 'create_purchase'
    });
    validate_uuid(internal_purchase_id);
    validate_uuid(user_id);
    validate_sale_item_key(sale_item_key);
    validate_sale_item_price(sale_item_price);
    validate_uuid(client_generated_idempotency_key);
    validate_sha512_hex(metadata_hash_email);
    validate_sha512_hex(metadata_hash_phone_number);
    validate_sha1_hex(metadata_hash_session_id);
    validate_sha512_hex(metadata_hash_ip_address);
    validate_sha512_hex(metadata_hash_name_on_card);
    validate_sha512_hex(metadata_hash_city);
    validate_sha512_hex(metadata_hash_country);
    validate_sha512_hex(metadata_hash_district);
    validate_sha512_hex(metadata_hash_address_line_1);
    validate_sha512_hex(metadata_hash_address_line_2);
    validate_sha512_hex(metadata_hash_postal_zip_code);
    validate_sha512_hex(metadata_hash_expiry_month);
    validate_sha512_hex(metadata_hash_expiry_year);
    validate_sha512_hex(metadata_hash_card_number);
    validate_sha512_hex(metadata_hash_circle_public_key_id);
    const now = new Date().getTime();
    const text = 
    `
        INSERT INTO "purchases" (
            "internal_purchase_id",
            "user_id",
            "sale_item_key",
            "sale_item_price",
            "game_id",
            "t_created_purchase",
            "t_modified_purchase",
            "client_generated_idempotency_key",
            "game_credited_result",
            "purchase_result",
            "t_created_create_card",
            "t_modified_create_card",
            "create_card_idempotency_key",
            "create_card_result",
            "public_key_result",
            "create_card_id",
            "t_created_payment_3ds",
            "t_modified_payment_3ds",
            "payment_3ds_idempotency_key",
            "payment_3ds_result",
            "payment_3ds_id",
            "t_created_payment_cvv",
            "t_modified_payment_cvv",
            "payment_cvv_idempotency_key",
            "payment_cvv_result",
            "payment_cvv_id",
            "t_created_payment_unsecure",
            "t_modified_payment_unsecure",
            "payment_unsecure_idempotency_key",
            "payment_unsecure_result",
            "payment_unsecure_id",
            "metadata_hash_email",
            "metadata_hash_phone_number",
            "metadata_hash_session_id",
            "metadata_hash_ip_address",
            "metadata_hash_name_on_card",
            "metadata_hash_city",
            "metadata_hash_country",
            "metadata_hash_district",
            "metadata_hash_address_line_1",
            "metadata_hash_address_line_2",
            "metadata_hash_postal_zip_code",
            "metadata_hash_expiry_month",
            "metadata_hash_expiry_year",
            "metadata_hash_card_number",
            "metadata_hash_circle_public_key_id"
        ) VALUES (
             $1,  $2,  $3,  $4,  $5,  $6,  $7,  $8,  $9, $10, 
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 
            $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, 
            $41, $42, $43, $44, $45, $46
        );
    `;
    const values = [
        internal_purchase_id,              // "internal_purchase_id",
        user_id,                  // "user_id",
        sale_item_key,                     // "sale_item_key",
        sale_item_price,                   // "sale_item_price",
        'NEON_DISTRICT',                   // "game_id",
        now,                               // "t_created_purchase",
        now,                               // "t_modified_purchase",
        client_generated_idempotency_key,  // "client_generated_idempotency_key",
        'NONE',                            // "game_credited_result",
        'PENDING',                         // "purchase_result",
        null,                              // "t_created_create_card",
        null,                              // "t_modified_create_card",
        null,                              // "create_card_idempotency_key",
        'NONE',                            // "create_card_result",
        'NONE',                            // "public_key_result",
        null,                              // "create_card_id",
        null,                              // "t_created_payment_3ds",
        null,                              // "t_modified_payment_3ds",
        null,                              // "payment_3ds_idempotency_key",
        'NONE',                            // "payment_3ds_result",
        null,                              // "payment_3ds_id",
        null,                              // "t_created_payment_cvv",
        null,                              // "t_modified_payment_cvv",
        null,                              // "payment_cvv_idempotency_key",
        'NONE',                            // "payment_cvv_result",
        null,                              // "payment_cvv_id",
        null,                              // "t_created_payment_unsecure",
        null,                              // "t_modified_payment_unsecure",
        null,                              // "payment_unsecure_idempotency_key",
        'NONE',                            // "payment_unsecure_result",
        null,                              // "payment_unsecure_id",
        metadata_hash_email,               // "metadata_hash_email",
        metadata_hash_phone_number,        // "metadata_hash_phone_number",
        metadata_hash_session_id,          // "metadata_hash_session_id",
        metadata_hash_ip_address,          // "metadata_hash_ip_address",
        metadata_hash_name_on_card,        // "metadata_hash_name_on_card",
        metadata_hash_city,                // "metadata_hash_city",
        metadata_hash_country,             // "metadata_hash_country",
        metadata_hash_district,            // "metadata_hash_district",
        metadata_hash_address_line_1,      // "metadata_hash_address_line_1",
        metadata_hash_address_line_2,      // "metadata_hash_address_line_2",
        metadata_hash_postal_zip_code,     // "metadata_hash_postal_zip_code",
        metadata_hash_expiry_month,        // "metadata_hash_expiry_month",
        metadata_hash_expiry_year,         // "metadata_hash_expiry_year",
        metadata_hash_card_number,         // "metadata_hash_card_number",
        metadata_hash_circle_public_key_id // "metadata_hash_circle_public_key_id"
    ];
    const result = await postgres.query(text, values);
    return expect_one_row_count(result);
};