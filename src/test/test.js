const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios').default.create();
const server = require('../server.js');
const postgres = require('../server/postgres/postgres.js');
const circle_integration_client = require('../circle_integration_client.js');
const reset_all_tables = require('../server/postgres/reset_all_tables.js');
const sha1 = require('../server/utilities/sha1.js');
const test_cards = require('./test_cards.js');
const test_cvvs = require('./test_cvvs.js');
const test_avss = require('./test_avss.js');

const ok_purchase = {
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

console.log(JSON.stringify(ok_purchase, null, 2));

const handle_redirect = async function (purchase_result, user_id) {
    assert(purchase_result.hasOwnProperty('redirect'));
    
    // get the circle session id, note this is not the session hash we create for integration
    const session_id = purchase_result.redirect.split('session/')[1];
    
    // load the 3ds page which invokes the session with circle
    const three_d_secure_page = await axios.get(purchase_result.redirect);
    
    // the 3ds page sends device information to circle, fake that 
    const device_information_result = await axios.post('https://web-sandbox.circle.com/v1/3ds/session/' + session_id + '/deviceInformation', {
        colorDepth: 32,
        javaEnabled: false,
        language: 'en-US',
        screenHeight: 1080,
        screenWidth: 1920,
        timeZoneOffset: 300,
        userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:95.0) Gecko/20100101 Firefox/95.0'
    });

    // the 3ds page goes into a spin wait while repeat polling circle, poll while processing until processeds
    let status_result;
    do {
        await new Promise(resolve => setTimeout(resolve, 5000));
        status_result = await axios.get('https://web-sandbox.circle.com/v1/3ds/session/' + session_id + '/status');
        assert(status_result.hasOwnProperty('data'));
        assert(status_result.data.hasOwnProperty('data'));
        status_result = status_result.data.data;
    } while (status_result.status === 'processing');
    assert.strictEqual(status_result.status, 'processed');
    
    const purchase_finalize_result = await circle_integration_client.purchase_finalize(
        user_id,
        purchase_result.internal_purchase_id
    );
    return purchase_finalize_result;
};

const should_throw = (fn) => {
    let threw = false;
    try {
        fn();
    } catch (error) {
        threw = true;
    }
    assert(threw);
};

describe('circle-integration-server', async function () {
    let test_server;

    before(async function () {
        await reset_all_tables();
        test_server = await server();
    });

    after(function () {
        process.exit(0);
    });

    it('validate uuid', function () {
        const validate_uuid = require('../server/validation/validate_uuid');

        // dont allow undefined
        should_throw(() => validate_uuid(undefined));

        // dont allow null
        should_throw(() => validate_uuid(null));

        // dont allow empty string
        should_throw(() => validate_uuid(''));

        // dont allow number
        should_throw(() => validate_uuid(41254));

        // dont allow object
        should_throw(() => validate_uuid({test: 'test'}));

        // dont allow array
        should_throw(() => validate_uuid(['test']));

        // dont allow < 36 length (35)
        should_throw(() => validate_uuid('11111111111111111111111111111111111'));

        // dont allow > 36 length (37)
        should_throw(() => validate_uuid('1111111111111111111111111111111111111'));

        // dont allow correct length (36) but wrong format
        should_throw(() => validate_uuid('111111111111111111111111111111111111'));

        // dont allow close to uuidv4
        should_throw(() => validate_uuid('5a31c2e-8e7f8-4ba7-8def-77b5cbf7be96'));

        // allow proper uuidv4
        validate_uuid('5a31c2e8-e7f8-4ba7-8def-77b5cbf7be96');
    });

    it('validate sha512_hex', function () {
        const validate_sha512_hex = require('../server/validation/validate_sha512_hex');

        // dont allow undefined
        should_throw(() => validate_sha512_hex(undefined));

        // dont allow undefined
        should_throw(() => validate_sha512_hex(null));

        // dont allow empty string
        should_throw(() => validate_sha512_hex(''));

        // dont allow number
        should_throw(() => validate_sha512_hex(41254));

        // dont allow object
        should_throw(() => validate_sha512_hex({test: 'test'}));

        // dont allow array
        should_throw(() => validate_sha512_hex(['test']));

        // dont allow < 128 length (127)
        should_throw(() => validate_sha512_hex('1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111'));

        // dont allow > 128 length (129)
        should_throw(() => validate_sha512_hex('111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111'));

        // dont allow correct length (128) but wrong format
        should_throw(() => validate_sha512_hex('g1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111'));

        // dont allow close to sha512 hex
        should_throw(() => validate_sha512_hex('g083f7dbaa9fd7872d61ce28896939ab6cdbb9f6f7d3a28b52e54991e5b75594ff5a2ca2d00f3429934cb92cf1833d37fb5d5cd921a2577953b87ed71ac410e7'));

        // allow proper sha512 hex
        validate_sha512_hex('2083f7dbaa9fd7872d61ce28896939ab6cdbb9f6f7d3a28b52e54991e5b75594ff5a2ca2d00f3429934cb92cf1833d37fb5d5cd921a2577953b87ed71ac410e7');
    });

    it('validate sale_item_key', function () {
        const validate_sale_item_key = require('../server/validation/validate_sale_item_key');

        // dont allow undefined
        should_throw(() => validate_sale_item_key(undefined));

        // dont allow null
        should_throw(() => validate_sale_item_key(null));

        // dont allow empty string
        should_throw(() => validate_sale_item_key(''));

        // dont allow number
        should_throw(() => validate_sale_item_key(41254));

        // dont allow object
        should_throw(() => validate_sale_item_key({test: 'test'}));

        // dont allow array
        should_throw(() => validate_sale_item_key(['test']));

        // dont allow < 3 length (2)
        should_throw(() => validate_sale_item_key('11'));

        // dont allow > 128 length (129)
        should_throw(() => validate_sale_item_key('111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111'));

        // allow proper sale item key
        validate_sale_item_key('big_neon_pack');
    });

    it('validate sale_item_price', function () {
        const validate_sale_item_price = require('../server/validation/validate_sale_item_price');

        // dont allow undefined
        should_throw(() => validate_sale_item_price(undefined));

        // dont allow null
        should_throw(() => validate_sale_item_price(null));

        // dont allow empty string
        should_throw(() => validate_sale_item_price(''));

        // dont allow number
        should_throw(() => validate_sale_item_price(41254));

        // dont allow object
        should_throw(() => validate_sale_item_price({test: 'test'}));

        // dont allow array
        should_throw(() => validate_sale_item_price(['test']));

        // dont allow < 4 length (3)
        should_throw(() => validate_sale_item_price('.11'));

        // dont allow > 16 length (17)
        should_throw(() => validate_sale_item_price('11111111111111.11'));

        // dont allow $
        should_throw(() => validate_sale_item_price('$420.69'));

        // dont allow ,
        should_throw(() => validate_sale_item_price('420,69'));

        // dont allow space
        should_throw(() => validate_sale_item_price('4 20.69'));

        // dont allow no decimal
        should_throw(() => validate_sale_item_price('42069'));

        // dont allow no decimal places
        should_throw(() => validate_sale_item_price('420.'));

        // dont allow one decimal place
        should_throw(() => validate_sale_item_price('420.6'));

        // dont allow more than two decimal places
        should_throw(() => validate_sale_item_price('420.699'));

        // allow proper sale item price
        validate_sale_item_price('420.69');
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('dont allow duplicate idempotency keys', async function () {
        const idempotency_key = circle_integration_client.generate_idempotency_key();        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            idempotency_key,
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);

        const purchase_result_2 = await circle_integration_client.purchase(
            idempotency_key,
            user_id,
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
        assert.strictEqual(purchase_result_2.error, 'Idempotency Collision');
    });

    it('PAYMENT_FAILED', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Payment Failed (Unspecified)'); 
    });

    it('CARD_NOT_HONORED', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Card Not Honored (Contact Card Provider)'); 
    });

    it('PAYMENT_NOT_SUPPORTED_BY_ISSUER', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Payment Not Supported (Contact Card Provider)'); 
    });

    it('PAYMENT_NOT_FUNDED', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Insufficient Funds (Contact Card Provider)'); 
    });

    it('CARD_INVALID', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Invalid Details (Correct Information)'); 
    });

    it('CARD_LIMIT_VIOLATED', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Limit Exceeded (Circle Limit)'); 
    });

    it('PAYMENT_DENIED', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Payment Denied (Contact Card Provider)'); 
    });

    it('PAYMENT_FRAUD_DETECTED', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Fraud Detected (Contact Card Provider)'); 
    });

    it('CREDIT_CARD_NOT_ALLOWED', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Ineligible Account (Contact Card Provider)'); 
    });

    it('PAYMENT_STOPPED_BY_ISSUER', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Payment Stopped (Contact Card Provider)'); 
    });

    it('CARD_ACCOUNT_INELIGIBLE', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Ineligible Account (Contact Card Provider)'); 
    });

    it('BAD_CVVS', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert.strictEqual(final_result.error, 'Invalid Details (Correct Information)'); 
    });

    it('should correct bad public key', async function () {
        // since other tests come before this one the server has already received and cached a public key
        // this public key is fetched for each purchase, so we fuck up the cached version which will cause
        // a public key failure, and force a key refresh. all of this should be handled automatically and
        // allow a successfull purchase without further intervention

        // fuck up the cached public key
        server.circle_integration_server.cached_public_key.keyId = 'junk';

        // do a normal purchase which should correct automatically        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 40);
    });

    it('invalid card number', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        assert.strictEqual(purchase_result.error, 'Invalid card_number');
    });

    it('invalid cvv string', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        assert.strictEqual(purchase_result.error, 'Invalid district');
    });

    it('invalid postal', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
            null,
            ok_purchase.expiry_month,
            ok_purchase.expiry_year,
            ok_purchase.email,
            ok_purchase.phone,
            ok_purchase.sale_item_key
        );
        assert.strictEqual(purchase_result.error, 'Invalid Details (Correct Information)');
    });

    it('invalid expiry month', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        assert.strictEqual(purchase_result.error, 'Invalid expiry_month');
    });

    it('invalid expiry year', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        assert.strictEqual(purchase_result.error, 'Invalid expiry_year');
    });

    it('invalid email', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        assert.strictEqual(purchase_result.error, 'Invalid email');
    });

    it('invalid email (number)', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS B', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS C', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS D', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS E', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS F', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS G', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS I', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS K', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS L', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS M', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS N', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS O', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS P', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS R', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS S', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS U', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS W', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS X', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS Y', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });
    
    it('AVS Z', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it('AVS -', async function () {        
        const user_id = uuidv4();
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            user_id,
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
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });
});