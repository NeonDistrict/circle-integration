const axios = require('axios').default;
const api_uri_base = 'https://api-sandbox.circle.com/v1/';
const public_key_cache_duration = 1000 * 60 * 60 * 24; // 24 hours

module.exports = circle_integration = {

    call_circle_api: async (method, endpoint) => {
        // attempt call, failures in the call itself will throw an error which we leave up to the caller to handle
        // todo this should be an if for post/get with query/body support where needed, but we need more calls first
        const response = await axios[method.toLowerCase()](`${api_uri_base}${endpoint}`);
        
        // confirm status code
        if (response.status !== 200) {
            console.log('response:');
            console.log(response);
            throw new Error('Expected status code 200 from circle');
        }
        
        // all circle responses are in a parent object with the single property 'data'
        // note do not be confused by the axios 'data' property in the response as per:
        // https://axios-http.com/docs/res_schema
        if (!response.data.hasOwnProperty('data')) {
            console.log('response:');
            console.log(response);
            throw new Error('Expected data in response from circle');
        }

        // api call looks okay, return the unpacked response
        // note again do not be confused by the axios 'data' property in the response
        return response.data.data;
    },

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
        const public_key = await circle_integration.call_circle_api('get', 'encryption/public');

        // cache new key and record time of cache
        circle_integration.cached_public_key = public_key;
        circle_integration.cached_public_key_timestamp = new Date().getTime();

        return public_key;
    }
};