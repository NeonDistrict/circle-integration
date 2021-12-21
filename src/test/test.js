const assert = require('assert');
const server = require('../server.js');
const circle_integration_client = require('../circle_integration_client.js');
const config_dev = require('../config.dev.js');


describe('circle-integration-server', function () {
    before(function (done) {
        server.initialize(config_dev, function (error) {
            if (error) {
                throw error;
            }
            done();
        });
    });

    after(function () {
        server.shutdown();
    });
    
    it('generate idempotency key', async function () {
        const idempotency_key = circle_integration_client.generate_idempotency_key();
        
    });

    it('get a public key', async function () {
        const public_key = await circle_integration_client.get_public_key();
        console.log((public_key));
        assert(public_key.hasOwnProperty('keyId'));
        assert(public_key.hasOwnProperty('publicKey'));
    });

    it('get a public key (force refresh)', async function () {
        const public_key = await circle_integration_client.get_public_key(true);
        assert(public_key.hasOwnProperty('keyId'));
        assert(public_key.hasOwnProperty('publicKey'));
    });
});