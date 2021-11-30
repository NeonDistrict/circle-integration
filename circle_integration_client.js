const { call_circle_api } = require("./circle_integration_server");

const circle_integration = {
    api_uri_base: 'http://localhost:3000/',

    generate_idempotency_key: () => {
        // todo, i dunno udid or someshit, suitable pseudo random chars is prol fine though
    },

    call_circle_api: async (endpoint, body) => {
        const request = new Request({
            url: `${api_uri_base}${endpoint}`,
            body: body || {},
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors',
            cache: 'default'
        });
        const response = (await fetch(request)).json();
        
        // todo generic error handling?
        return response;
    },


    public_key: null,
    get_public_key: async () => {
        // we handle the public key on behalf of the client but they still need to make the call to handle any errors
        circle_integration.public_key = await circle_integration.call_circle_api('get_public_key');
    },

    hash_card_number: (card_number) => {
        // todo, sha?
    },

    encrypt_card_information: async (card_number, card_cvv) => {
        // ensure the user followed the readme and called get public key first
        if (circle_integration.public_key === null) {
            throw new Error('You must call circle_integration.get_public_key() before calling this function');
        }
        
        // package the card details to be encrypted
        const card_details = {
            number: card_number,
            cvv: card_cvv
        };

        // use openpgp to read and decode the public key
        const decoded_public_key = await readKey({armoredKey: atob(circle_integration.public_key.publicKey)});
        
        // use openpgp to create the message (of the card details) for encryption
        const message = await createMessage({text: JSON.stringify(card_details)});
        
        // use openpgp to encrypt
        const cipher_text = await encrypt({
            message: message,
            encryptionKeys: decoded_public_key,
        });

        // return the encrypted card information and key id which will be used to help decrypt it later
        return {
            encryptedMessage: btoa(cipher_text),
            keyId: circle_integration.public_key.keyId
        };
    },

    create_card: async (idempotency_key, card_number, card_cvv, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year) => {
        // hash card number
        const hashed_card_number = circle_integration.hash_card_number(card_number);
        
        // encrypt card information
        const encrypted_card_information = circle_integration.encrypt_card_information(card_number, card_cvv);
    
        // call to create the card, on success we will get the card_id
        // todo theres a boatload of failures here including verification of cards that need to be handled
        // todo maybe we need more than the card id here? but i think it should just be basically an "okay cool" response then we use a list to get cards
        const card_id = await circle_integration.call_circle_api('create_card', {
            idempotency_key: idempotency_key,
            key_id: circle_integration.public_key.keyId,
            hashed_card_number: hashed_card_number,
            encrypted_card_information: encrypted_card_information,
            name_on_card: name_on_card,
            city: city,
            country: country,
            address_line_1: address_line_1,
            address_line_2: address_line_2,
            district: district,
            postal_zip_code: postal_zip_code,
            expiry_month: expiry_month,
            expiry_year: expiry_year
        });
    },
};