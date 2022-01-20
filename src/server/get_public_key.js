const call_circle = require('./call_circle.js');
let cached_public_key = null;
let cached_public_key_timestamp = null;
const public_key_cache_duration = 1000 * 60 * 60 * 24; // 24 hours
// todo this should be in config

module.exports = get_public_key = (config, force_refresh, cb) => {
    // circle reccommends caching our public key which changes infrequently for at least 24 hours as per:
    // https://developers.circle.com/reference#getpublickey
    // check if we have a cached copy, and use it if cache is still valid
    // if a public key fails the client can use force refresh, todo or maybe the server detects this, invalidates it and the client calls again?
    const cache_valid = cached_public_key_timestamp !== null && new Date().getTime() - cached_public_key_timestamp <= public_key_cache_duration;
    if (!force_refresh && cache_valid) {
        return cb(null, cached_public_key);
    }

    // if we have no cached key, or the cache has reached expiry, get a new public key from circle
    call_circle([200], 'get', `${config.api_uri_base}encryption/public`, null, (error, public_key) => {
        if (error) {
            return cb(error);
        }

        // cache new key and record time of cache
        cached_public_key = public_key;
        cached_public_key_timestamp = new Date().getTime();

        // return public key
        return cb(null, public_key);
    });
}