const log = require('../../utilities/log.js');
const config = require('../../../config.js');
const call_circle = require('../../utilities/call_circle.js');

module.exports = async (body) => {
    log({
        event: 'get public keys', 
        body: body
    });

    const public_keys = {};
    
    // circle reccommends caching our public key which changes infrequently for at least 24 hours as per:
    // https://developers.circle.com/reference#getpublickey
    // check if we have a cached copy, and use it if cache is still valid
    const cache_valid = 
        config.cached_circle_key && 
        config.cached_circle_key_timestamp && 
        new Date().getTime() - config.cached_circle_key_timestamp <= config.public_key_cache_duration;
    if (cache_valid) {
        log({
            event: 'get public keys cache was valid', 
            body: body
        });
        public_keys.circle_public_key = config.cached_circle_key;
        return public_keys;
    }
    log({
        event: 'get public keys cache was invalid', 
        body: body
    });

    // if we have no cached key, or the cache has reached expiry, get a new public key from circle
    const circle_public_key = await call_circle(null, [200], 'get', `/encryption/public`, null);

    // cache new key and record time of cache
    config.cached_circle_key = circle_public_key;
    config.cached_circle_key_timestamp = new Date().getTime();

    // return public keys
    public_keys.circle_public_key = circle_public_key;
    return public_keys;
};