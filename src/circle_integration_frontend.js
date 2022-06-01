const config = require('./config.js');
const { v4: uuidv4 } = require('uuid');
const openpgp = require('openpgp');
const axios = require('axios').default.create();

module.exports = circle_integration_frontend = {

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

    circle_encrypt_card_information: async (card_number, card_cvv) => {
        const to_encrypt = {
            number: card_number, 
            cvv: card_cvv
        };
        
        const public_keys = await circle_integration_frontend.call_api('/get_public_keys', {});
        if (public_keys.hasOwnProperty('error')) {
            return public_keys;
        }
        const public_key = public_keys.circle_public_key.publicKey;
        const decoded_public_key = await openpgp.readKey({armoredKey: circle_integration_frontend.atob(public_key)});
        const message = await openpgp.createMessage({text: JSON.stringify(to_encrypt)});
        const cipher_text = await openpgp.encrypt({
            message: message,
            encryptionKeys: decoded_public_key,
        });
        return {
            circle_encrypted_card_information: circle_integration_frontend.btoa(cipher_text),
            circle_public_key_id: public_keys.circle_public_key.keyId
        };
    },
};