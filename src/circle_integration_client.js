const config = require('./config.dev.js');
const verification_types_enum = require('./enum/verification_types_enum.js');
const { v4: uuidv4 } = require('uuid');
const openpgp = require('openpgp');
const axios = require('axios').default.create();

module.exports = circle_integration_client = {

    generate_idempotency_key: () => {
        return uuidv4();
    },

    call_circle_api: async (endpoint, data) => {
        // form request
        const request = {
            method: 'post',
            url: `${config.server_url}${endpoint}`,
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        };
        if (data !== null) {
            request.data = data;
        }
        
        // make request
        let response;
        try {
            response = await axios(request);
        } catch (request_error) {
            // axios wont return the response normally on error codes, associate it here
            response = request_error.response;
        }

        // get the response body from the response
        const response_body = response.data;
        return response_body;
    },

    atob: (key) => {
        return Buffer.from(key, 'base64').toString('binary');
    },

    btoa: (key) => {
        return Buffer.from(key, 'binary').toString('base64');
    },

    encrypt_card_information: async (public_key, card_number, card_cvv) => {
        const card_details = {
            number: card_number,
            cvv: card_cvv
        };
        const decoded_public_key = await openpgp.readKey({armoredKey: circle_integration_client.atob(public_key.publicKey)});
        const message = await openpgp.createMessage({text: JSON.stringify(card_details)});
        const cipher_text = await openpgp.encrypt({
            message: message,
            encryptionKeys: decoded_public_key,
        });
        return {
            encryptedMessage: circle_integration_client.btoa(cipher_text),
            keyId: public_key.keyId
        };
    },

    purchase: async (client_generated_idempotency_key, card_number, card_cvv, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, sale_item_key) => {
        const public_key = await circle_integration_client.call_circle_api('/get_public_key');
        const encrypted_card_information = await circle_integration_client.encrypt_card_information(public_key, card_number, card_cvv);
        const request_body = {
            client_generated_idempotency_key: client_generated_idempotency_key,
            verification_type: verification_type,
            encrypted_card_information: encrypted_card_information,
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
            sale_item_key: sale_item_key
        }
        const purchase_result = await circle_integration_client.call_circle_api('/purchase', request_body);

        // if we recieve a redirect it means we are going through the 3dsecure flow return the redirect url for the implementor to go to
        if (purchase_result.hasOwnProperty('redirect')) {
            return purchase_result;
        }
        
        // if we received an error
        if (purchase_result.hasOwnProperty('error')) {

            // if the public key was bad 
            if (!force_refresh_public_key && purchase_result.error === 'Public Key Failure') {
                
                // get a new idempotency key for the retry
                const retry_client_generated_idempotency_key = circle_integration_client.generate_idempotency_key();
                return await circle_integration_client.purchase(retry_client_generated_idempotency_key, card_number, card_cvv, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year, email, phone_number, sale_item_key);
            }
        }
        return purchase_result;
    }
};