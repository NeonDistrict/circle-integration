const config = require('./config.js');
const { v4: uuidv4 } = require('uuid');
const openpgp = require('openpgp');
const axios = require('axios').default.create();

module.exports = circle_integration_client = {

    generate_idempotency_key: () => {
        return uuidv4();
    },

    call_api: async (endpoint, data) => {
        if (!data) {
            throw new Error('Data Required');
        }
        const request = {
            method: 'post',
            url: `${config.server_url}${endpoint}`,
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors',
            data: data
        };
        let response;
        try {
            response = await axios(request);
        } catch (request_error) {
            return request_error.response.data;
        }
        const response_body = response.data;
        return response_body;
    },

    atob: (key) => {
        return Buffer.from(key, 'base64').toString('binary');
    },

    btoa: (key) => {
        return Buffer.from(key, 'binary').toString('base64');
    },

    circle_encrypt_card_information: async (public_key, to_encrypt) => {
        const decoded_public_key = await openpgp.readKey({armoredKey: circle_integration_client.atob(public_key)});
        const message = await openpgp.createMessage({text: JSON.stringify(to_encrypt)});
        const cipher_text = await openpgp.encrypt({
            message: message,
            encryptionKeys: decoded_public_key,
        });
        return circle_integration_client.btoa(cipher_text);
    },

    purchase: async (client_generated_idempotency_key, user_id, metadata_hash_session_id, ip_address, card_number, card_cvv, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, sale_item_key, success_url, failure_url, is_retry = false) => {
        const public_keys = await circle_integration_client.call_api('/get_public_keys', {
            user_id: user_id
        });
        if (public_keys.hasOwnProperty('error')) {
            return public_keys;
        }
        const circle_encrypted_card_information = await circle_integration_client.circle_encrypt_card_information(public_keys.circle_public_key.publicKey, {number: card_number, cvv: card_cvv});
        const request_body = {
            client_generated_idempotency_key: client_generated_idempotency_key,
            circle_public_key_id: public_keys.circle_public_key.keyId,
            circle_encrypted_card_information: circle_encrypted_card_information,
            user_id: user_id,
            metadata_hash_session_id: metadata_hash_session_id,
            ip_address: ip_address,
            name_on_card: name_on_card,
            city: city,
            country: country,
            address_line_1: address_line_1,
            address_line_2: address_line_2,
            district: district,
            postal_zip_code: postal_zip_code,
            expiry_month: expiry_month,
            expiry_year: expiry_year,
            email: email,
            phone_number: phone_number,
            sale_item_key: sale_item_key,
            success_url: success_url,
            failure_url: failure_url
        };
        const purchase_result = await circle_integration_client.call_api('/purchase/create', request_body);

        // if we recieve a redirect it means we are going through the 3dsecure flow return the redirect url for the implementor to go to
        if (purchase_result.hasOwnProperty('redirect')) {
            return purchase_result;
        }
        
        // if we received an error
        if (purchase_result.hasOwnProperty('error')) {

            // if a public key was bad 
            if (purchase_result.error === 'Circle Key Failure') {
                
                // if we already did a retry to refresh the public keys and it failed, return the error
                if (is_retry) {
                    return purchase_result;
                }

                // we will retry to refresh the public keys, get a new idempotency key for the retry
                is_retry = true;
                const retry_client_generated_idempotency_key = circle_integration_client.generate_idempotency_key();
                return await circle_integration_client.purchase(retry_client_generated_idempotency_key, card_number, card_cvv, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, sale_item_key, is_retry);
            }
        }

        // return the failure or success result of the purchase
        return purchase_result;
    },

    purchase_finalize: async (user_id, internal_purchase_id) => {
        const request_body = {
            user_id: user_id,
            internal_purchase_id: internal_purchase_id
        }
        const purchase_finalize_result = await circle_integration_client.call_api('/purchase/finalize', request_body);
        return purchase_finalize_result;
    },

    purchase_history: async (user_id, limit, skip) => {
        const request_body = {
            user_id: user_id,
            limit: limit,
            skip: skip
        }
        const purchase_history_result = await circle_integration_client.call_api('/purchase/history', request_body);
        return purchase_history_result;
    }
};