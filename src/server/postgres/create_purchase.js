const is_valid_sale_item_key = require('../validation/is_valid_sale_item_key.js');
const is_valid_sale_item_price = require('../validation/is_valid_sale_item_price.js');
const is_valid_uuid = require('../validation/is_valid_uuid.js');
const is_valid_sha512_hex = require('../validation/is_valid_sha512_hex.js');
const is_valid_sha1_hex = require('../validation/is_valid_sha1_hex.js');
const expect_one_row_count = require('./expect_one_row_count.js');

module.exports = create_purchase = (
    config, 
    query, 
    internal_purchase_id,
    user_id,
    sale_item_key,
    sale_item_price,
    client_generated_idempotency_key,
    metadata_hash_email,
    metadata_hash_phone_number,
    metadata_hash_session_id,
    metadata_hash_ip_address,
    metadata_hash_name_on_card,
    metadata_hash_city,
    metadata_hash_country,
    metadata_hash_district,
    metadata_hash_address_line_1,
    metadata_hash_address_line_2,
    metadata_hash_postal_zip_code,
    metadata_hash_expiry_month,
    metadata_hash_expiry_year,
    metadata_hash_card_number,
    metadata_hash_circle_public_key_id,
    cb
) => {
    if (!is_valid_uuid(internal_purchase_id)) {
        return cb({
            error: 'Invalid internal_purchase_id'
        });
    }
    if (!is_valid_uuid(user_id)) {
        return cb({
            error: 'Invalid user_id'
        });
    }
    if (!is_valid_sale_item_key(sale_item_key)) {
        return cb({
            error: 'Invalid sale_item_key'
        });
    }
    if (!is_valid_sale_item_price(sale_item_price)) {
        return cb({
            error: 'Invalid sale_item_price'
        });
    }
    if (!is_valid_uuid(client_generated_idempotency_key)) {
        return cb({
            error: 'Invalid client_generated_idempotency_key'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_email)) {
        return cb({
            error: 'Invalid metadata_hash_email'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_phone_number)) {
        return cb({
            error: 'Invalid metadata_hash_phone_number'
        });
    }
    if (!is_valid_sha1_hex(metadata_hash_session_id)) {
        return cb({
            error: 'Invalid metadata_hash_session_id'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_ip_address)) {
        return cb({
            error: 'Invalid metadata_hash_ip_address'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_name_on_card)) {
        return cb({
            error: 'Invalid metadata_hash_name_on_card'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_city)) {
        return cb({
            error: 'Invalid metadata_hash_city'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_country)) {
        return cb({
            error: 'Invalid metadata_hash_country'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_district)) {
        return cb({
            error: 'Invalid metadata_hash_district'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_address_line_1)) {
        return cb({
            error: 'Invalid metadata_hash_address_line_1'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_address_line_2)) {
        return cb({
            error: 'Invalid metadata_hash_address_line_2'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_postal_zip_code)) {
        return cb({
            error: 'Invalid metadata_hash_postal_zip_code'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_expiry_month)) {
        return cb({
            error: 'Invalid metadata_hash_expiry_month'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_expiry_year)) {
        return cb({
            error: 'Invalid metadata_hash_expiry_year'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_card_number)) {
        return cb({
            error: 'Invalid metadata_hash_card_number'
        });
    }
    if (!is_valid_sha512_hex(metadata_hash_circle_public_key_id)) {
        return cb({
            error: 'Invalid metadata_hash_circle_public_key_id'
        });
    }

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
    return query(text, values, (error, result) => expect_one_row_count(error, result, cb));
};