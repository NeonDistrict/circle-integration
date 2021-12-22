const assert = require('assert');
const server = require('../server.js');
const circle_integration_client = require('../circle_integration_client.js');
const config_dev = require('../config.dev.js');
const test_cards = require('./test_cards.js');

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
        assert(typeof idempotency_key === 'string');
        assert(idempotency_key.length === 36);
    });

    it('make a purchase', async function () {
        const test_card = test_cards[0];

        const idempotency_key = circle_integration_client.generate_idempotency_key();
        const purchase_result = await circle_integration_client.purchase(
            idempotency_key,
            test_card.card_number,
            123,
            'Theo Banks',
            'Toronto',
            'CA',
            '420 Pickadilly Lane',
            '',
            'ON',
            'M4C 2K2',
            12,
            2024,
            'theobanks@neondistrict.io',
            '+16132134512',
            'NEON_1000'
        );
        console.log('purchase result');
        console.log(purchase_result);
    });
});