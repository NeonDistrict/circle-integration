const { v4: uuidv4 } = require('uuid');
const openpgp = require('openpgp');
const sha512 = require('./utilities/sha512.js');
const create_card = require('./create_card.js');
const create_payment = require('./create_payment.js');
const is_valid_card_number = require('./validation/is_valid_card_number.js');
const is_purchase_idempotent_equal = require('./utilities/is_purchase_idempotent_equal.js');
const assess_existing_purchase_result = require('./assess_existing_purchase_result.js');

module.exports = purchase = async (config, postgres, user_id, client_generated_idempotency_key, circle_public_key_id, circle_encrypted_card_information, integration_encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, session_id, ip_address, sale_item_key, cb) => {
    // find sale item
    const sale_item = config.sale_items.find((search_sale_item) => { return search_sale_item.sale_item_key === sale_item_key; });
    if (sale_item === undefined || sale_item === null) {
        return cb({
            error: 'Sale Item Key Not Found'
        });
    }

    // decrypt card information for hashing
    let integration_decrypted_card_information = null;
    try {
        const decryption_result = await openpgp.decrypt({
            message: await openpgp.readMessage({
                armoredMessage: integration_encrypted_card_information 
            }),
            verificationKeys: config.pgp_public_key,
            decryptionKeys: await openpgp.decryptKey({
                privateKey: await openpgp.readPrivateKey({ 
                    armoredKey: config.pgp_private_key 
                }),
                passphrase: config.pgp_passphrase
            })
        });
        integration_decrypted_card_information = JSON.parse(decryption_result.data);
    } catch (error) {
        return cb({
            error: 'Integration Key Failure'
        });
    }
    if (!is_valid_card_number(integration_decrypted_card_information.card_number)) {
        return cb({
            error: 'Invalid card_number'
        });
    }

    // hash metadata
    const internal_purchase_id               = uuidv4();
    const metadata_hash_email                = sha512(email);
    const metadata_hash_phone_number         = sha512(phone_number);
    const metadata_hash_session_id           = sha512(session_id);
    const metadata_hash_ip_address           = sha512(ip_address);
    const metadata_hash_name_on_card         = sha512(name_on_card);
    const metadata_hash_city                 = sha512(city);
    const metadata_hash_country              = sha512(country);
    const metadata_hash_district             = sha512(district);
    const metadata_hash_address_line_1       = sha512(address_line_1);
    const metadata_hash_address_line_2       = sha512(address_line_2);
    const metadata_hash_postal_zip_code      = sha512(postal_zip_code);
    const metadata_hash_expiry_month         = sha512(expiry_month);
    const metadata_hash_expiry_year          = sha512(expiry_year);
    const metadata_hash_card_number          = sha512(integration_decrypted_card_information.card_number);
    const metadata_hash_circle_public_key_id = sha512(circle_public_key_id);

    // todo all fraud checks need to happen right here and not be passed through

    postgres.find_purchase_by_client_generated_idempotency_key(client_generated_idempotency_key, (error, existing_purchase) => {
        if (error) {
            return cb(error);
        }
        if (existing_purchase !== null) {
            if (is_purchase_idempotent_equal(existing_purchase, user_id, sale_item.sale_item_key, sale_item.sale_item_price, client_generated_idempotency_key, metadata_hash_email, metadata_hash_phone_number, metadata_hash_session_id, metadata_hash_ip_address, metadata_hash_name_on_card, metadata_hash_city, metadata_hash_country, metadata_hash_district, metadata_hash_address_line_1, metadata_hash_address_line_2, metadata_hash_postal_zip_code, metadata_hash_expiry_month, metadata_hash_expiry_year, metadata_hash_card_number, metadata_hash_circle_public_key_id)) {
                return assess_existing_purchase_result(existing_purchase, cb);
            } else {
                return cb({
                    error: 'Idempotency Collision',
                    fraud: 1
                });
            }
        }
        postgres.create_purchase(internal_purchase_id, user_id, sale_item.sale_item_key, sale_item.sale_item_price, client_generated_idempotency_key, metadata_hash_email, metadata_hash_phone_number, metadata_hash_session_id, metadata_hash_ip_address, metadata_hash_name_on_card, metadata_hash_city, metadata_hash_country, metadata_hash_district, metadata_hash_address_line_1, metadata_hash_address_line_2, metadata_hash_postal_zip_code, metadata_hash_expiry_month, metadata_hash_expiry_year, metadata_hash_card_number, metadata_hash_circle_public_key_id, (error) => {
            if (error) {
                return cb(error);
            }
            create_card(config, postgres, user_id, internal_purchase_id, circle_public_key_id, circle_encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, session_id, ip_address, (error, card_id) => {
                if (error) {
                    return cb(error);
                }
                create_payment(config, postgres, user_id, card_id, assessed_create_card_result.id, circle_public_key_id, circle_encrypted_card_information, email, phone_number, session_id, ip_address, sale_item, (error, assessment) => {
                    if (error) {
                        return cb(error);
                    }
                    return cb(null, assessment);
                });
            });
        });
    });
};