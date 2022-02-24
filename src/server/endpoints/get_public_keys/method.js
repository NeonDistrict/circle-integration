const config = require('../../../config.js');
const call_circle = require('../../call_circle.js');

module.exports = async (body) => {
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
        return public_keys;
    }

    // if we have no cached key, or the cache has reached expiry, get a new public key from circle
    // todo: prevent 429 for now 
    //const circle_public_key = await call_circle('none', [200], 'get', `/encryption/public`, null);

    // todo: hardcode circle pk because of rate limiting on running tests over and over
    circle_public_key = {
        "keyId": "key1",
        "publicKey": "LS0tLS1CRUdJTiBQR1AgUFVCTElDIEtFWSBCTE9DSy0tLS0tCgptUUVOQkY0YzhWZ0JDQUM4QnN6WElCTytiZDZ4VnhLMUdlc3hLK2sybnlpamZ0NDdWa2xnbU80VmpTSmMzQS8yCkljeDNyWFR3S0ZIV282ckJBVUduSVhoK2ZYKzIwZGYwbld6WlNvN3ZNK0ZpMTMzVlpuTG0zalk4cVozdnR5WEMKenhqZnJ5UnlDSncrMlh6cnRGVklYT0RLSEd0RjhUSXZFNUdjdVMxclNmMGlsVUtzOWxUdXlOTEx1bXZJQ2RTeQpCMWQ3MUVCM3VDMUJpekRtaWplMHNFbjB0QXBGS3V0ZnB5aWtsbTZwWm9zWnVnYVUzL1Z3NWNkQTU5VlhHWnFpCjNTWGdzeHU1RE4zc21TU3ZVVkthMUtQd3hackZRZHQ2a3lOVUFuR0lRS3d4b3BjejAyY255R3JvZEdGU3c5TC8KbzlmeHo3Q3FpcnJvL3F6VjJzQmxFMkRvZWVLY09ZVTlzVHRCQUJFQkFBRzBCa05wY21Oc1pZa0JWQVFUQVFnQQpQaFloQlBTc3RXN3o4TkgrWVQ1MGE3S1dkbkdNTUlYQUJRSmVIUEZZQWhzREJRazRaQWtBQlFzSkNBY0NCaFVLCkNRZ0xBZ1FXQWdNQkFoNEJBaGVBQUFvSkVMS1dkbkdNTUlYQXhSQUgvM2xVL1hJbEkrZG5PR2pGRHJCTHMzcUYKN1grV0xsSU5YRmlaNWFuRC9ySnRUbGptb2R2dkhSSmlJTm1GcTRrNi90MURqcTJsdWpXTTFIUmJIaUtxTE56dQovWVJNNG5aL1lGUUd2YktqY3dNWHJDZ1Y1UFNESjZJdTE3MW4vdFFrYXFmRzd0M2ZXQzQzek10VFM4YnV6ZEtGCkQ1ai9yd0VkUjhhOXlsc0luWDdPZXlqekpUeENjQm1udmE1LzhZRFF4NFd4bk1WQWJ4ZnRRSjJzUXNJa0pNQ2MKV1d0TVZwZWlSSExlbWg1cnNhWnBnSkZ5cW1QODJXaDd0aGRkWHd3eVFGcHVUc2x6b1VKMmJaakZyMUxDSjBxRQp3MVJBOFVHaWhPUFB2SVprc2RvdFVDVDhoeXJPYU9GbUtDVUhhV0FQYzRDT3NzdVJpMU5VSGpJUVA0bVUyU0M1CkFRMEVYaHp4V0FFSUFMZFhXTUJaODlQZHFrSVRPWWZlL1pZZko4c2Nudk1PdlovQW1Vb3JpakM4M1VMdjVLbWsKSGpjVXJTR0pFYkpOdDl2NWVpc2RGOFRDNzVwZmhBLzZiOHZCUTVoMU0yT0FoUklYZGlJY1hLaTJyTXhINU9jWQo2YWFkWlVIRFIrYUZWRmtWdm53UnkxVFRDOFNleWs5UDRtd2lrTzl2RGlpMmU1SFl0R1pQcUVEWXVRN05pQnM2CktMRWpHclMwWFpieHg4WVk5enRRTUZKc2ZjdXRJd2lvTy9HcU1ZMFRKdkI0QnVJWTh2TjhPTnVubHZjb2JBYS8KcVRpYVFUcE93T3g2eElPbHB0TkFST1pncUNPZEk2R2NqMjRZRmcycEV4d0h0SjBXOFJpRDBpNEJJU0tEYkZEVAovWmlkMkptZW9vdG0vZXpaNUlDSUZNNk1wOEhDTjB6eWFSMEFFUUVBQVlrQlBBUVlBUWdBSmhZaEJQU3N0Vzd6CjhOSCtZVDUwYTdLV2RuR01NSVhBQlFKZUhQRllBaHNNQlFrNFpBa0FBQW9KRUxLV2RuR01NSVhBdmVJSC9BM1IKOTdlSENUOHdlOUFDUXkxcDJmNk41UFd6QWRaTUtQNm9QTXhpNFlCVUoyK1orNDVibnB2a0ZSdllMVjNwVFRIRApEY0N5cWh4Z0cxdEVGaVUyclZINlFzRStnWldYZkJPZU1lWHhqRkt0U0lzNktQUWViVlMrUHJhOHljK3RPakxOCkZsNlFCRjNGcGJ3YmE5L1pPbk1rbW9yTE1IV241RnJOVy9aZnVLdzhTMHFGQ29nUVNxUUVpbjZnQ0ZEd0gzK0QKQ2JzcDVKMm4xN1pncjBpcGRRYjk4MDJ1bXdDVG9aVGtwL0pwb2t4YzJTZlczaG0xUEc4M1NPUGdMUll0a3JuTApRbURYSmtDdEN6amN3eGQwdnJpVzM4Y29zQko1aVN4WHU5MEZHRWZaaGQ1Y0o4cFpKSkd2VGMrMyt6eE1sWU1HCnZmUjNvUFFoWmtwT2NyRUhlajA9Cj1BT0QzCi0tLS0tRU5EIFBHUCBQVUJMSUMgS0VZIEJMT0NLLS0tLS0K"
    }

    // cache new key and record time of cache
    config.cached_circle_key = circle_public_key;
    config.cached_circle_key_timestamp = new Date().getTime();

    // return public keys
    public_keys.circle_public_key = circle_public_key;
    return public_keys;
};