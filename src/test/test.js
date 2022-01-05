const assert = require('assert');
const axios = require('axios').default.create();
const create_server = require('../server.js');
const circle_integration_client = require('../circle_integration_client.js');
const config_dev = require('../config.dev.js');
const test_cards = require('./test_cards.js');
const test_cvvs = require('./test_cvvs.js');
const test_avss = require('./test_avss.js');
const verification_types_enum = require('../enum/verification_types_enum.js');

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
    let test_server;

    before(function (done) {
        create_server(config_dev, function (error, created_server) {
            if (error) {
                throw error;
            }
            test_server = created_server;
            done();
        });
    });

    after(function () {
        test_server.shutdown();
    });
    
    it('generate idempotency key', async function () {
        const idempotency_key = circle_integration_client.generate_idempotency_key();
        assert(typeof idempotency_key === 'string');
        assert(idempotency_key.length === 36);
    });

    it('reject malformed json', async function () {
        const malformed_json = '{"key": "value';
        const result = await circle_integration_client.call_circle_api('/purchase', malformed_json);
        assert(result.hasOwnProperty('error'));
        assert(result.error === 'Malformed Body');
    });

    it('reject body to large', async function () {
        const big_object = [];
        for (let i = 0; i < 1000; i++) {
            big_object.push({
                lorem: "ipsum",
                delorem: "desote",
                insola: "yetsole",
                vora: "inara"
            });
        }
        const big_json = JSON.stringify(big_object, null, 2);
        const result = await circle_integration_client.call_circle_api('/purchase', big_json);
        assert(result.hasOwnProperty('error'));
        assert(result.error === 'Body Too Large');
    });

    it('make a purchase force 3dsecure', async function () {
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
            ok_purchase.sale_item_key,
            verification_types_enum.THREE_D_SECURE
        );
        assert(purchase_result.hasOwnProperty('redirect'));
        console.log(purchase_result.redirect);
        
        const session_id = purchase_result.redirect.split('session/')[1];
        const three_d_secure_page = await axios.get(purchase_result.redirect);
        const device_information_result = await axios.post('https://web-sandbox.circle.com/v1/3ds/session/' + session_id + '/deviceInformation', {
            colorDepth: 32,
            javaEnabled: false,
            language: 'en-US',
            screenHeight: 1080,
            screenWidth: 1920,
            timeZoneOffset: 300,
            userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:95.0) Gecko/20100101 Firefox/95.0'
        });
        let status_result;
        do {
            status_result = await axios.get('https://web-sandbox.circle.com/v1/3ds/session/' + session_id + '/status');
            assert(status_result.hasOwnProperty('data'));
    let test_three_d_secure_server;
            assert(status_result.data.hasOwnProperty('data'));
            status_result = status_result.data.data;
        } while (status_result.status === 'processing');
        assert(status_result.status === 'processed');
        
        console.log('we should be doing a get against our server to finalize the result with the purchase id that gets returned in the processed status result');

    });

    it('make a purchase force cvv', async function () {
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
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.status === 'confirmed');
    });

    it('dont allow duplicate idempotency keys', async function () {
        const idempotency_key = circle_integration_client.generate_idempotency_key();
        const purchase_result = await circle_integration_client.purchase(
            idempotency_key,
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
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.status === 'confirmed');

        const purchase_result_2 = await circle_integration_client.purchase(
            idempotency_key,
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
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        // todo this should be an error and its not, reported to circle
        assert(purchase_result_2.error === 'Idempotency Key Already Used');
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
            'PAYMENT_FAILED',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Payment Failed (Unspecified)'); 
    });

    it('CARD_NOT_HONORED', async function () {
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
            'CARD_NOT_HONORED',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Card Not Honored (Contact Card Provider)'); 
    });

    it('PAYMENT_NOT_SUPPORTED_BY_ISSUER', async function () {
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
            'PAYMENT_NOT_SUPPORTED_BY_ISSUER',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Payment Not Supported (Contact Card Provider)'); 
    });

    it('PAYMENT_NOT_FUNDED', async function () {
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
            'PAYMENT_NOT_FUNDED',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Insufficient Funds (Contact Card Provider)'); 
    });

    it('CARD_INVALID', async function () {
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
            'CARD_INVALID',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)'); 
    });

    it('CARD_LIMIT_VIOLATED', async function () {
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
            'CARD_LIMIT_VIOLATED',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Limit Exceeded (Circle Limit)'); 
    });

    it('PAYMENT_DENIED', async function () {
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
            'PAYMENT_DENIED',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Payment Denied (Contact Card Provider)'); 
    });

    it('PAYMENT_FRAUD_DETECTED', async function () {
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
            'PAYMENT_FRAUD_DETECTED',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Fraud Detected (Contact Card Provider)'); 
    });

    it('CREDIT_CARD_NOT_ALLOWED', async function () {
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
            'CREDIT_CARD_NOT_ALLOWED',
            verification_types_enum.CVV
        );
        // todo circle sends the wrong response code here, waiting on their response (adrian) dec 27th 2021
        assert(purchase_result.error === 'Card Not Allowed (Contact Card Provider)'); 
    });

    it('PAYMENT_STOPPED_BY_ISSUER', async function () {
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
            'PAYMENT_STOPPED_BY_ISSUER',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Payment Stopped (Contact Card Provider)'); 
    });

    it('CARD_ACCOUNT_INELIGIBLE', async function () {
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
            'CARD_ACCOUNT_INELIGIBLE',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Ineligible Account (Contact Card Provider)'); 
    });

    it('BAD_CVVS', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            test_cvvs[0],
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
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)'); 
    });

    it('should correct bad public key', async function () {
        // since other tests come before this one the server has already received and cached a public key
        // this public key is fetched for each purchase, so we fuck up the cached version which will cause
        // a public key failure, and force a key refresh. all of this should be handled automatically and
        // allow a successfull purchase without further intervention

        // fuck up the cached public key
        server.circle_integration_server.cached_public_key.keyId = 'junk';

        // do a normal purchase which should correct automatically
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
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.status === 'confirmed');
    });

    it('invalid card number', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            'bogus',
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
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid cvv', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            'bogus',
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
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid name', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            42069,
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
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid city', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            null,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid country', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            42069,
            ok_purchase.address_1,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid address 1', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            null,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('address 2 always valid', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            42069,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.status === 'confirmed');

        const purchase_result_2 = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            null,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result_2.status === 'confirmed');

        const purchase_result_3 = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            undefined,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result_3.status === 'confirmed');

        const purchase_result_4 = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            'LOREM IPSUM BOGUS BONUS DELORUM DUS BOGUSEN LAS DOSEN BOGUS LOREM IPSUM BOGUS BONUS DELURM DUS BODUSED LAS DDOSEN HORSEN DORSEN SHORSEN',
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result_4.status === 'confirmed');
    });

    it('invalid district', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_1,
            ok_purchase.address_2,
            42069,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid postal', async function () {
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
            null,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid expiry month', async function () {
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
            'BOGUS',
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        // todo waiting to hear back from circle, this should be a 400 error with details
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid expiry year', async function () {
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
            'BOGUS',
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        // todo waiting to hear back from circle, this should be a 400 error with details
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid email', async function () {
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
            'BOGUS',
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid email (number)', async function () {
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
            42069,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid phone', async function () {
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
            'BOGUS',
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Invalid Details (Correct Information)');
    });

    it('invalid sale item key', async function () {
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
            'BOGUS',
            verification_types_enum.CVV
        );
        assert(purchase_result.error === 'Sale Item Key Not Found');
    });

    it('AVS A', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_A.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'A');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS B', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_B.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'B');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS C', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_C.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'C');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS D', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_D.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'D');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS E', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_E.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'E');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS F', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_F.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'F');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS G', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_G.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'G');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS I', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_I.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'I');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS K', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_K.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'K');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS L', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_L.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'L');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS M', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_M.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'M');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS N', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_N.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'N');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS O', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_O.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'O');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS P', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_P.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'P');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS R', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_R.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'R');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS S', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_S.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'S');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS U', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_U.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'U');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS W', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_W.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'W');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS X', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_X.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'X');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS Y', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_Y.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'Y');
        assert(purchase_result.status === 'confirmed');
    });
    
    it('AVS Z', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_Z.value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === 'Z');
        assert(purchase_result.status === 'confirmed');
    });

    it('AVS -', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss['TEST_-'].value,
            ok_purchase.address_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key,
            verification_types_enum.CVV
        );
        assert(purchase_result.verification.avs === '-');
        assert(purchase_result.status === 'confirmed');
    });
});