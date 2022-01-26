const call_circle = require('./call_circle.js');

module.exports = get_public_keys = (config, cb) => {
    const public_keys = {
        integration_public_key: config.pgp_public_key
    };
    
    // circle reccommends caching our public key which changes infrequently for at least 24 hours as per:
    // https://developers.circle.com/reference#getpublickey
    // check if we have a cached copy, and use it if cache is still valid
    const cache_valid = 
        config.cached_circle_key && 
        config.cached_circle_key_timestamp && 
        new Date().getTime() - config.cached_circle_key_timestamp <= config.public_key_cache_duration;
    if (cache_valid) {
        public_keys.circle_public_key = config.cached_circle_key;
        return cb(null, public_keys);
    }

    // if we have no cached key, or the cache has reached expiry, get a new public key from circle
    call_circle(config, [200], 'get', `${config.api_uri_base}encryption/public`, null, (error, public_key) => {
        if (error) {
            return cb(error);
        }

        // cache new key and record time of cache
        config.cached_circle_key = public_key;
        config.cached_circle_key_timestamp = new Date().getTime();

        // return public key
        public_keys.circle_public_key = public_key;
        return cb(null, public_keys);
    });
}