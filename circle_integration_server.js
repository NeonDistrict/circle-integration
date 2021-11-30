const axios = require('axios').default;
const api_uri_base = 'https://api-sandbox.circle.com/v1/';
const public_key_cache_duration = 1000 * 60 * 60 * 24; // 24 hours

module.exports = circle_integration = {
    cached_public_key: null,
    cached_public_key_timestamp: null,
    get_public_key: async () => {
        // circle reccommends caching our public key which changes infrequently for at least 24 hours as per:
        // https://developers.circle.com/reference#getpublickey
        // check if we have a cached copy, and use it if cache is still good
        if (circle_integration.cached_public_key_timestamp === null || new Date().getTime() - circle_integration.cached_public_key_timestamp <= public_key_cache_duration) {
            return circle_integration.cached_public_key;
        }

        // if we have no cached key, or the cache has reached expiry, get a new public key from circle
        const response = await axios({
            method: 'get',
            url: `${api_uri_base}encryption/public`
        });
        
        // confirm status code 200
        if (response.status !== 200) {
            console.log('response:', response);
            throw new Error('Expected status code 200 from circle');
        }
        
        // confirm response has a data parent object
        if (!response.data.hasOwnProperty('data')) {
            console.log('response:', response);
            throw new Error('Expected data in response from circle');
        }

        // unpack data parent object
        const public_key = response.data.data;

        // cache new key and record time of cache
        circle_integration.cached_public_key = public_key;
        circle_integration.cached_public_key_timestamp = new Date().getTime();

        return public_key;
    },

    create_card: async (idempotency_key, key_id, hashed_card_number, encrypted_card_information, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year) => {
        // todo ensure this card isnt already on this account, flow for updating card?
        // todo fraud check to confirm this card hash isnt on any other account
        // todo whats the best way to get metadata into here, including sessioning?

        // call api to create card
        const response = await axios({
            method: 'post',
            url: `${api_uri_base}cards`,
            data: {
                idempotencyKey: idempotency_key,
                keyId: key_id,
                encryptedData: encrypted_card_information,
                billingDetails: {
                    name: name_on_card,
                    city: city,
                    country: country,
                    line1: address_line_1,
                    line2: address_line_2,
                    district: district,
                    postalCode: postal_zip_code
                },
                expMonth: expiry_month,
                expYear: expiry_year,
                metadata: {
                    email: 'todo',
                    phoneNumber: 'todo',
                    sessionId: 'todo',
                    ipAddress: 'todo'
                }
            }
        });
        
        // confirm status code of 201 created
        if (response.status !== 201) {
            console.log('response:', response);
            throw new Error('Expected status code 201 from circle');
        }
        
        // confirm response has a data parent object
        if (!response.data.hasOwnProperty('data')) {
            console.log('response:', response);
            throw new Error('Expected data in response from circle');
        }

        // unpack data parent object
        const created_card = response.data.data;

        // we just need to acknowledge that the card was created, a call will be made to list for details
        
        return {ok: 1};
    },

    update_card: async (key_id, card_id, encrypted_card_information, expiry_month, expiry_year) => {
        // call api to update card
        const response = await axios({
            method: 'put',
            url: `${api_uri_base}cards/${card_id}`,
            data: {
                keyId: key_id,
                encryptedData: encrypted_card_information,
                expMonth: expiry_month,
                expYear: expiry_year
            }
        });
        
        // confirm status code of 200 
        if (response.status !== 200) {
            console.log('response:', response);
            throw new Error('Expected status code 200 from circle');
        }
        
        // confirm response has a data parent object
        if (!response.data.hasOwnProperty('data')) {
            console.log('response:', response);
            throw new Error('Expected data in response from circle');
        }

        // unpack data parent object
        const updated_card = response.data.data;

        // we just need to acknowledge that the card was updated, a call will be made to list for details
        
        return {ok: 1};
    }
};