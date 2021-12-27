const assert = require('assert');
const server = require('../server.js');
const circle_integration_client = require('../circle_integration_client.js');
const config_dev = require('../config.dev.js');
const test_cards = require('./test_cards.js');
const test_amounts = require('./test_amounts.js');

const ok_purchase = {
    card_number: test_cards[0].card_number,
    cvv: 123, 
    name: 'Theo Banks',
    city: 'Toronto',
    country: 'CA',
    address_1: '420 Pickadilly Lane',
    address_2: '',
    district: 'ON',
    postal: 'M4C 2K2',
    expiry_month: 12,
    expiry_year: 2024,
    email: 'theobanks@neondistrict.io',
    phone: '+16132134512',
    sale_item_key: 'NEON_1000'
};

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
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert(purchase_result.status === 'confirmed');
    });

    it('PAYMENT_FAILED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_FAILED'
        );
        assert(purchase_result.error === 'Payment Failed (Unspecified)'); 
    });

    it.only('CARD_NOT_HONORED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'CARD_NOT_HONORED'
        );
        assert(purchase_result.error === 'Card Not Honored (Contact Card Provider)'); 
    });

    it.only('PAYMENT_NOT_SUPPORTED_BY_ISSUER', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_NOT_SUPPORTED_BY_ISSUER'
        );
        assert(purchase_result.error === 'Payment Not Supported (Contact Card Provider)'); 
    });

    it.only('PAYMENT_NOT_FUNDED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_NOT_FUNDED'
        );
        assert(purchase_result.error === 'Insufficient Funds (Contact Card Provider)'); 
    });

    it.only('CARD_INVALID', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'CARD_INVALID'
        );
        assert(purchase_result.error === 'Invalid Card Details (Correct Information)'); 
    });

    it.only('CARD_LIMIT_VIOLATED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'CARD_LIMIT_VIOLATED'
        );
        assert(purchase_result.error === 'Limit Exceeded (Circle Limit)'); 
    });

    it.only('PAYMENT_DENIED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_DENIED'
        );
        assert(purchase_result.error === 'Payment Denied (Contact Card Provider)'); 
    });

    it.only('PAYMENT_FRAUD_DETECTED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_FRAUD_DETECTED'
        );
        assert(purchase_result.error === 'Fraud Detected (Contact Card Provider)'); 
    });

    it.only('CREDIT_CARD_NOT_ALLOWED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'CREDIT_CARD_NOT_ALLOWED'
        );
        // todo circle sends the wrong response code here, waiting on their response (adrian) dec 27th 2021
        assert(purchase_result.error === 'Card Not Allowed (Contact Card Provider)'); 
    });

    it.only('PAYMENT_STOPPED_BY_ISSUER', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_STOPPED_BY_ISSUER'
        );
        assert(purchase_result.error === 'Payment Stopped (Contact Card Provider)'); 
    });

    it.only('CARD_ACCOUNT_INELIGIBLE', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'CARD_ACCOUNT_INELIGIBLE'
        );
        assert(purchase_result.error === 'Ineligible Account (Contact Card Provider)'); 
    });
});