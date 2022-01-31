const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios').default.create();
const create_server = require('../server.js');
const create_postgres = require('../server/postgres/postgres.js');
const circle_integration_client = require('../circle_integration_client.js');
const sha1 = require('../server/utilities/sha1.js');
const config_dev = require('../config.dev.js');
const test_cards = require('./test_cards.js');
const test_cvvs = require('./test_cvvs.js');
const test_avss = require('./test_avss.js');

const ok_purchase = {
    user_id: uuidv4(),
    metadata_hash_session_id: sha1(uuidv4()),
    ip_address: '127.0.0.1',
    card_number: test_cards[0].card_number,
    cvv: 123, 
    name: 'Theo Banks',
    city: 'Toronto',
    country: 'CA',
    address_line_1: '420 Pickadilly Lane',
    address_line_2: '',
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
    let test_postgres;

    before(function (done) {
        create_postgres(config_dev, function (error, created_postgres) {
            if (error) {
                throw error;
            }
            test_postgres = created_postgres;
            test_postgres.reset_all_tables((error, result) => {
                if (error) {
                    throw error;
                }
                create_server(config_dev, test_postgres, function (error, created_server) {
                    if (error) {
                        throw error;
                    }
                    test_server = created_server;
                    done();
                });
            });
        });
    });

    after(function () {
        test_server.shutdown();
        test_postgres.shutdown();
    });

    it('validate uuid', function () {
        const is_valid_uuid = require('../server/validation/is_valid_uuid');
        let result = null;

        // dont allow undefined
        result = is_valid_uuid(undefined);
        assert.strictEqual(result, false);

        // dont allow undefined
        result = is_valid_uuid(null);
        assert.strictEqual(result, false);

        // dont allow empty string
        result = is_valid_uuid('');
        assert.strictEqual(result, false);

        // dont allow number
        result = is_valid_uuid(41254);
        assert.strictEqual(result, false);

        // dont allow object
        result = is_valid_uuid({test: 'test'});
        assert.strictEqual(result, false);

        // dont allow array
        result = is_valid_uuid(['test']);
        assert.strictEqual(result, false);

        // dont allow < 36 length (35)
        result = is_valid_uuid('11111111111111111111111111111111111');
        assert.strictEqual(result, false);

        // dont allow > 36 length (37)
        result = is_valid_uuid('1111111111111111111111111111111111111');
        assert.strictEqual(result, false);

        // dont allow correct length (36) but wrong format
        result = is_valid_uuid('111111111111111111111111111111111111');
        assert.strictEqual(result, false);

        // dont allow close to uuidv4
        result = is_valid_uuid('5a31c2e-8e7f8-4ba7-8def-77b5cbf7be96');
        assert.strictEqual(result, false);

        // allow proper uuidv4
        result = is_valid_uuid('5a31c2e8-e7f8-4ba7-8def-77b5cbf7be96');
        assert.strictEqual(result, true);
    });

    it('validate sha512_hex', function () {
        const is_valid_sha512_hex = require('../server/validation/is_valid_sha512_hex');
        let result = null;

        // dont allow undefined
        result = is_valid_sha512_hex(undefined);
        assert.strictEqual(result, false);

        // dont allow undefined
        result = is_valid_sha512_hex(null);
        assert.strictEqual(result, false);

        // dont allow empty string
        result = is_valid_sha512_hex('');
        assert.strictEqual(result, false);

        // dont allow number
        result = is_valid_sha512_hex(41254);
        assert.strictEqual(result, false);

        // dont allow object
        result = is_valid_sha512_hex({test: 'test'});
        assert.strictEqual(result, false);

        // dont allow array
        result = is_valid_sha512_hex(['test']);
        assert.strictEqual(result, false);

        // dont allow < 128 length (127)
        result = is_valid_sha512_hex('1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111');
        assert.strictEqual(result, false);

        // dont allow > 128 length (129)
        result = is_valid_sha512_hex('111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111');
        assert.strictEqual(result, false);

        // dont allow correct length (128) but wrong format
        result = is_valid_sha512_hex('g1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111');
        assert.strictEqual(result, false);

        // dont allow close to sha512 hex
        result = is_valid_sha512_hex('g083f7dbaa9fd7872d61ce28896939ab6cdbb9f6f7d3a28b52e54991e5b75594ff5a2ca2d00f3429934cb92cf1833d37fb5d5cd921a2577953b87ed71ac410e7');
        assert.strictEqual(result, false);

        // allow proper sha512 hex
        result = is_valid_sha512_hex('2083f7dbaa9fd7872d61ce28896939ab6cdbb9f6f7d3a28b52e54991e5b75594ff5a2ca2d00f3429934cb92cf1833d37fb5d5cd921a2577953b87ed71ac410e7');
        assert.strictEqual(result, true);
    });

    it('validate sale_item_key', function () {
        const is_valid_sale_item_key = require('../server/validation/is_valid_sale_item_key');
        let result = null;

        // dont allow undefined
        result = is_valid_sale_item_key(undefined);
        assert.strictEqual(result, false);

        // dont allow null
        result = is_valid_sale_item_key(null);
        assert.strictEqual(result, false);

        // dont allow empty string
        result = is_valid_sale_item_key('');
        assert.strictEqual(result, false);

        // dont allow number
        result = is_valid_sale_item_key(41254);
        assert.strictEqual(result, false);

        // dont allow object
        result = is_valid_sale_item_key({test: 'test'});
        assert.strictEqual(result, false);

        // dont allow array
        result = is_valid_sale_item_key(['test']);
        assert.strictEqual(result, false);

        // dont allow < 3 length (2)
        result = is_valid_sale_item_key('11');
        assert.strictEqual(result, false);

        // dont allow > 128 length (129)
        result = is_valid_sale_item_key('111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111');
        assert.strictEqual(result, false);

        // allow proper sale item key
        result = is_valid_sale_item_key('big_neon_pack');
        assert.strictEqual(result, true);
    });

    it('validate sale_item_price', function () {
        const is_valid_sale_item_price = require('../server/validation/is_valid_sale_item_price');
        let result = null;

        // dont allow undefined
        result = is_valid_sale_item_price(undefined);
        assert.strictEqual(result, false);

        // dont allow null
        result = is_valid_sale_item_price(null);
        assert.strictEqual(result, false);

        // dont allow empty string
        result = is_valid_sale_item_price('');
        assert.strictEqual(result, false);

        // dont allow number
        result = is_valid_sale_item_price(41254);
        assert.strictEqual(result, false);

        // dont allow object
        result = is_valid_sale_item_price({test: 'test'});
        assert.strictEqual(result, false);

        // dont allow array
        result = is_valid_sale_item_price(['test']);
        assert.strictEqual(result, false);

        // dont allow < 4 length (3)
        result = is_valid_sale_item_price('.11');
        assert.strictEqual(result, false);

        // dont allow > 16 length (17)
        result = is_valid_sale_item_price('11111111111111.11');
        assert.strictEqual(result, false);

        // dont allow $
        result = is_valid_sale_item_price('$420.69');
        assert.strictEqual(result, false);

        // dont allow ,
        result = is_valid_sale_item_price('420,69');
        assert.strictEqual(result, false);

        // dont allow space
        result = is_valid_sale_item_price('4 20.69');
        assert.strictEqual(result, false);

        // dont allow no decimal
        result = is_valid_sale_item_price('42069');
        assert.strictEqual(result, false);

        // dont allow no decimal places
        result = is_valid_sale_item_price('420.');
        assert.strictEqual(result, false);

        // dont allow one decimal place
        result = is_valid_sale_item_price('420.6');
        assert.strictEqual(result, false);

        // dont allow more than two decimal places
        result = is_valid_sale_item_price('420.699');
        assert.strictEqual(result, false);

        // allow proper sale item price
        result = is_valid_sale_item_price('420.69');
        assert.strictEqual(result, true);
    });
    
    it('generate idempotency key', async function () {
        const idempotency_key = circle_integration_client.generate_idempotency_key();
        assert.strictEqual(typeof idempotency_key, 'string');
        assert.strictEqual(idempotency_key.length, 36);
    });

    it('reject malformed json', async function () {
        const malformed_json = '{"key": "value';
        const result = await circle_integration_client.call_circle_api('/purchase', malformed_json);
        assert(result.hasOwnProperty('error'));
        assert.strictEqual(result.error, 'Malformed Body');
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
        assert.strictEqual(result.error, 'Body Too Large');
    });

    it('make a normal purchase', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert(purchase_result.hasOwnProperty('redirect'));
        
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
            assert(status_result.data.hasOwnProperty('data'));
            status_result = status_result.data.data;
        } while (status_result.status === 'processing');
        assert.strictEqual(status_result.status, 'processed');
        
        console.log('we should be doing a get against our server to finalize the result with the purchase id that gets returned in the processed status result');

    });

    it('dont allow duplicate idempotency keys', async function () {
        const idempotency_key = circle_integration_client.generate_idempotency_key();
        const purchase_result = await circle_integration_client.purchase(
            idempotency_key,
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.status, 'confirmed');

        const purchase_result_2 = await circle_integration_client.purchase(
            idempotency_key,
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            test_cards[1].card_number,
            222,
            'Different Name',
            'Different City',
            ok_purchase.country,
            'Different Address',
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            11,
            2026,
            'different@email.com',
            '+16132221234',
            ok_purchase.sale_item_key
        );
        // todo this should be an error and its not, reported to circle
        assert.strictEqual(purchase_result_2.error, 'Idempotency Key Already Used');
    });

    it('PAYMENT_FAILED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_FAILED'
        );
        assert.strictEqual(purchase_result.error, 'Payment Failed (Unspecified)'); 
    });

    it('CARD_NOT_HONORED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'CARD_NOT_HONORED'
        );
        assert.strictEqual(purchase_result.error, 'Card Not Honored (Contact Card Provider)'); 
    });

    it('PAYMENT_NOT_SUPPORTED_BY_ISSUER', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_NOT_SUPPORTED_BY_ISSUER'
        );
        assert.strictEqual(purchase_result.error, 'Payment Not Supported (Contact Card Provider)'); 
    });

    it('PAYMENT_NOT_FUNDED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_NOT_FUNDED'
        );
        assert.strictEqual(purchase_result.error, 'Insufficient Funds (Contact Card Provider)'); 
    });

    it('CARD_INVALID', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'CARD_INVALID'
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)'); 
    });

    it('CARD_LIMIT_VIOLATED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'CARD_LIMIT_VIOLATED'
        );
        assert.strictEqual(purchase_result.error, 'Limit Exceeded (Circle Limit)'); 
    });

    it('PAYMENT_DENIED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_DENIED'
        );
        assert.strictEqual(purchase_result.error, 'Payment Denied (Contact Card Provider)'); 
    });

    it('PAYMENT_FRAUD_DETECTED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_FRAUD_DETECTED'
        );
        assert.strictEqual(purchase_result.error, 'Fraud Detected (Contact Card Provider)'); 
    });

    it('CREDIT_CARD_NOT_ALLOWED', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'CREDIT_CARD_NOT_ALLOWED'
        );
        // todo circle sends the wrong response code here, waiting on their response (adrian) dec 27th 2021
        assert.strictEqual(purchase_result.error, 'Card Not Allowed (Contact Card Provider)'); 
    });

    it('PAYMENT_STOPPED_BY_ISSUER', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'PAYMENT_STOPPED_BY_ISSUER'
        );
        assert.strictEqual(purchase_result.error, 'Payment Stopped (Contact Card Provider)'); 
    });

    it('CARD_ACCOUNT_INELIGIBLE', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'CARD_ACCOUNT_INELIGIBLE'
        );
        assert.strictEqual(purchase_result.error, 'Ineligible Account (Contact Card Provider)'); 
    });

    it('BAD_CVVS', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            test_cvvs[0],
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)'); 
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
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('invalid card number', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            'bogus',
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid cvv string', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            'bogus',
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid cvv float', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            123.456,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid cvv too big', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            123456789,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid name', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            42069,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid city', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            null,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid country', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            42069,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid address 1', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            null,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid address 2', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            null,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid district', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            42069,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid postal', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            'POSTAL CODE',
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid expiry month', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            'BOGUS',
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        // todo waiting to hear back from circle, this should be a 400 error with details
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid expiry year', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            'BOGUS',
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        // todo waiting to hear back from circle, this should be a 400 error with details
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid email', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            'BOGUS',
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid email (number)', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            42069,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid phone', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            'BOGUS',
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid sale item key', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            ok_purchase.address_line_1,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            'BOGUS'
        );
        assert.strictEqual(purchase_result.error, 'Sale Item Key Not Found');
    });

    it('AVS A', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_A.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'A');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS B', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_B.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'B');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS C', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_C.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'C');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS D', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_D.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'D');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS E', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_E.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'E');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS F', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_F.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'F');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS G', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_G.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'G');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS I', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_I.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'I');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS K', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_K.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'K');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS L', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_L.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'L');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS M', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_M.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'M');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS N', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_N.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'N');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS O', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_O.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'O');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS P', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_P.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'P');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS R', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_R.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'R');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS S', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_S.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'S');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS U', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_U.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'U');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS W', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_W.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'W');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS X', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_X.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'X');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS Y', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_Y.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'Y');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });
    
    it('AVS Z', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss.TEST_Z.value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, 'Z');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });

    it('AVS -', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            ok_purchase.user_id,
            ok_purchase.metadata_hash_session_id,
            ok_purchase.ip_address,
            ok_purchase.card_number,
            ok_purchase.cvv,
            ok_purchase.name,
            ok_purchase.city,
            ok_purchase.country,
            test_avss['TEST_-'].value,
            ok_purchase.address_line_2,
            ok_purchase.district,
            ok_purchase.postal,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.verification.avs, '-');
        assert.strictEqual(purchase_result.status, 'confirmed');
    });
});