const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios').default.create();
const server = require('../server.js');
const config = require('../config.js');
const circle_integration_client = require('../circle_integration_client.js');
const circle_integration_crm_client = require('../circle_integration_crm_client.js');
const reset_all_tables = require('../server/postgres/reset_all_tables.js');
const test_create_custom_purchase = require('../server/postgres/test_create_custom_purchase.js');
const test_create_user = require('../server/postgres/test_create_user.js');
const sha1 = require('../server/utilities/sha1.js');
const test_cards = require('./test_cards.js');
const test_cvvs = require('./test_cvvs.js');
const test_avss = require('./test_avss.js');
const sha512 = require('../server/utilities/sha512.js');

const default_user_id = uuidv4();
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
        
        test_server = await server();
    });

    beforeEach(async function () {
        await reset_all_tables();
    });

    after(function () {
        test_server.shutdown();
    });

    it.only('make a normal purchase', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            default_user_id,
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
            ok_purchase.sale_item_key,
            config.three_d_secure_success_url,
            'https://localhost.com/',//config.three_d_secure_success_url,
            'https://localhost.com/'//config.three_d_secure_failure_url
        );
        const final_result = await handle_redirect(purchase_result, default_user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);
    });

    it.only('make a normal purchase (force cvv)', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            default_user_id,
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
            'TEST_CVV',
            config.three_d_secure_success_url,
            config.three_d_secure_failure_url
        );
        assert(!purchase_result.hasOwnProperty('redirect'));
        assert(purchase_result.hasOwnProperty('internal_purchase_id') && purchase_result.internal_purchase_id.length === 36);
    });

    it.only('make a normal purchase (force unsecure)', async function () {
        const purchase_result = await circle_integration_client.purchase(
            circle_integration_client.generate_idempotency_key(),
            default_user_id,
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
            'TEST_UNSECURE',
            config.three_d_secure_success_url,
            config.three_d_secure_failure_url
        );
        assert(!purchase_result.hasOwnProperty('redirect'));
        assert(purchase_result.hasOwnProperty('internal_purchase_id') && purchase_result.internal_purchase_id.length === 36);
    });

    it.only('test monthly user limit', async function () {
        const now = new Date().getTime();
        const two_weeks_ago = now - (604800000 * 2);
        const user_id = uuidv4();
        await test_create_user({
            user_id: user_id,
            t_created: 1,
            t_modified: 1,
            fraud: false
        });
        
        // create a purchase 99 cents away from the limit for the month
        const fake_purchase = {
            internal_purchase_id: uuidv4(), 
            user_id: user_id, 
            sale_item_key: 'debug', 
            sale_item_price: (config.purchase_limits.monthly - 0.99).toString(), 
            game_id: 'NEON_DISTRICT', 
            t_created_purchase: two_weeks_ago, 
            t_modified_purchase: two_weeks_ago, 
            client_generated_idempotency_key: uuidv4(), 
            game_credited_result: 'NONE', 
            purchase_result: 'COMPLETED', 
            t_created_create_card: null, 
            t_modified_create_card: null, 
            create_card_idempotency_key: null, 
            create_card_result: 'NONE', 
            public_key_result: 'NONE', 
            create_card_id: null, 
            t_created_payment_3ds: null, 
            t_modified_payment_3ds: null, 
            payment_3ds_idempotency_key: null, 
            payment_3ds_result: 'NONE', 
            payment_3ds_id: null, 
            t_created_payment_cvv: null, 
            t_modified_payment_cvv: null, 
            payment_cvv_idempotency_key: null, 
            payment_cvv_result: 'NONE', 
            payment_cvv_id: null, 
            t_created_payment_unsecure: null, 
            t_modified_payment_unsecure: null, 
            payment_unsecure_idempotency_key: null, 
            payment_unsecure_result: 'NONE', 
            payment_unsecure_id: null, 
            metadata: {
                email: sha512('debug'),
                phone_number: sha512('debug'),
                session_id: sha1('debug'),
                ip_address: sha512('debug'),
                name_on_card: sha512(ok_purchase.name),
                city: sha512('debug'),
                country: sha512('debug'),
                district: sha512('debug'),
                address_line_1: sha512('debug'),
                address_line_2: sha512('debug'),
                postal_zip_code: sha512('debug'),
                expiry_month: sha512('debug'),
                expiry_year: sha512('debug'),
                card_number: sha512( ok_purchase.card_number),
                circle_public_key_id: sha512('debug')
            }
        };
        await test_create_custom_purchase(fake_purchase);

        // attempt to make a purchase for 1$ putting us over the montly limit
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
            'TEST_CVV',
            config.three_d_secure_success_url,
            config.three_d_secure_failure_url
        );
        assert(purchase_result.error, 'Purchase Would Exceed Monthly Limit For User');
    });

    it.only('test weekly user limit', async function () {
        const now = new Date().getTime();
        const two_days_ago = now - (86400000 * 2);
        const user_id = uuidv4();
        await test_create_user({
            user_id: user_id,
            t_created: 1,
            t_modified: 1,
            fraud: false
        });
        
        // create a purchase 99 cents away from the limit for the week
        const fake_purchase = {
            internal_purchase_id: uuidv4(), 
            user_id: user_id, 
            sale_item_key: 'debug', 
            sale_item_price: (config.purchase_limits.weekly - 0.99).toString(), 
            game_id: 'NEON_DISTRICT', 
            t_created_purchase: two_days_ago, 
            t_modified_purchase: two_days_ago, 
            client_generated_idempotency_key: uuidv4(), 
            game_credited_result: 'NONE', 
            purchase_result: 'COMPLETED', 
            t_created_create_card: null, 
            t_modified_create_card: null, 
            create_card_idempotency_key: null, 
            create_card_result: 'NONE', 
            public_key_result: 'NONE', 
            create_card_id: null, 
            t_created_payment_3ds: null, 
            t_modified_payment_3ds: null, 
            payment_3ds_idempotency_key: null, 
            payment_3ds_result: 'NONE', 
            payment_3ds_id: null, 
            t_created_payment_cvv: null, 
            t_modified_payment_cvv: null, 
            payment_cvv_idempotency_key: null, 
            payment_cvv_result: 'NONE', 
            payment_cvv_id: null, 
            t_created_payment_unsecure: null, 
            t_modified_payment_unsecure: null, 
            payment_unsecure_idempotency_key: null, 
            payment_unsecure_result: 'NONE', 
            payment_unsecure_id: null, 
            metadata: {
                email: sha512('debug'),
                phone_number: sha512('debug'),
                session_id: sha1('debug'),
                ip_address: sha512('debug'),
                name_on_card: sha512(ok_purchase.name),
                city: sha512('debug'),
                country: sha512('debug'),
                district: sha512('debug'),
                address_line_1: sha512('debug'),
                address_line_2: sha512('debug'),
                postal_zip_code: sha512('debug'),
                expiry_month: sha512('debug'),
                expiry_year: sha512('debug'),
                card_number: sha512(ok_purchase.card_number),
                circle_public_key_id: sha512('debug')
            }
        };
        await test_create_custom_purchase(fake_purchase);

        // attempt to make a purchase for 1$ putting us over the weekly limit
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
            'TEST_CVV',
            config.three_d_secure_success_url,
            config.three_d_secure_failure_url
        );
        assert(purchase_result.error, 'Purchase Would Exceed Weekly Limit For User');
    });

    it.only('test daily user limit', async function () {
        const now = new Date().getTime();
        const user_id = uuidv4();
        await test_create_user({
            user_id: user_id,
            t_created: 1,
            t_modified: 1,
            fraud: false
        });
        
        // create a purchase 99 cents away from the limit for the day
        const fake_purchase = {
            internal_purchase_id: uuidv4(), 
            user_id: user_id, 
            sale_item_key: 'debug', 
            sale_item_price: (config.purchase_limits.daily - 0.99).toString(), 
            game_id: 'NEON_DISTRICT', 
            t_created_purchase: now, 
            t_modified_purchase: now, 
            client_generated_idempotency_key: uuidv4(), 
            game_credited_result: 'NONE', 
            purchase_result: 'COMPLETED', 
            t_created_create_card: null, 
            t_modified_create_card: null, 
            create_card_idempotency_key: null, 
            create_card_result: 'NONE', 
            public_key_result: 'NONE', 
            create_card_id: null, 
            t_created_payment_3ds: null, 
            t_modified_payment_3ds: null, 
            payment_3ds_idempotency_key: null, 
            payment_3ds_result: 'NONE', 
            payment_3ds_id: null, 
            t_created_payment_cvv: null, 
            t_modified_payment_cvv: null, 
            payment_cvv_idempotency_key: null, 
            payment_cvv_result: 'NONE', 
            payment_cvv_id: null, 
            t_created_payment_unsecure: null, 
            t_modified_payment_unsecure: null, 
            payment_unsecure_idempotency_key: null, 
            payment_unsecure_result: 'NONE', 
            payment_unsecure_id: null, 
            metadata: {
                email: sha512('debug'),
                phone_number: sha512('debug'),
                session_id: sha1('debug'),
                ip_address: sha512('debug'),
                name_on_card: sha512(ok_purchase.name),
                city: sha512('debug'),
                country: sha512('debug'),
                district: sha512('debug'),
                address_line_1: sha512('debug'),
                address_line_2: sha512('debug'),
                postal_zip_code: sha512('debug'),
                expiry_month: sha512('debug'),
                expiry_year: sha512('debug'),
                card_number: sha512(ok_purchase.card_number),
                circle_public_key_id: sha512('debug')
            }
        };
        await test_create_custom_purchase(fake_purchase);

        // attempt to make a purchase for 1$ putting us over the daily limit
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
            'TEST_CVV',
            config.three_d_secure_success_url,
            config.three_d_secure_failure_url
        );
        assert(purchase_result.error, 'Purchase Would Exceed Daily Limit For User');
    });

    it.only('crm refund a payment', async function () {
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
            ok_purchase.sale_item_key,
            config.three_d_secure_success_url,
            'https://localhost.com/',//config.three_d_secure_success_url,
            'https://localhost.com/'//config.three_d_secure_failure_url
        );
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);

        const purchase = await circle_integration_crm_client.purchase_get(final_result.internal_purchase_id);
        assert(purchase.hasOwnProperty('internal_purchase_id') && purchase.hasOwnProperty('payment_3ds_id'));
        const refund_result = await circle_integration_crm_client.payment_refund(purchase.internal_purchase_id, purchase.payment_3ds_id, 'requested_by_customer');
        assert(refund_result.refunded === 1);
    });

    it.only('crm cancel a payment', async function () {
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
            ok_purchase.sale_item_key,
            config.three_d_secure_success_url,
            'https://localhost.com/',//config.three_d_secure_success_url,
            'https://localhost.com/'//config.three_d_secure_failure_url
        );
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);

        const purchase = await circle_integration_crm_client.purchase_get(final_result.internal_purchase_id);
        assert(purchase.hasOwnProperty('internal_purchase_id') && purchase.hasOwnProperty('payment_3ds_id'));
        const cancel_result = await circle_integration_crm_client.payment_cancel(purchase.internal_purchase_id, purchase.payment_3ds_id, 'requested_by_customer');
        assert(cancel_result.cancelled === 1);
    });

    it.only('crm get payment', async function () {
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
            ok_purchase.sale_item_key,
            config.three_d_secure_success_url,
            'https://localhost.com/',//config.three_d_secure_success_url,
            'https://localhost.com/'//config.three_d_secure_failure_url
        );
        const final_result = await handle_redirect(purchase_result, user_id);
        assert(final_result.hasOwnProperty('internal_purchase_id') && final_result.internal_purchase_id.length === 36);

        const purchase = await circle_integration_crm_client.purchase_get(final_result.internal_purchase_id);
        assert(purchase.hasOwnProperty('internal_purchase_id') && purchase.hasOwnProperty('payment_3ds_id'));
        const payment = await circle_integration_crm_client.payment_get(purchase.payment_3ds_id);
        assert(payment.id === purchase.payment_3ds_id);
    });

    // todo need to test card limits, but requires crm whitelist first
    
    it.only('generate idempotency key', async function () {
        const idempotency_key = circle_integration_client.generate_idempotency_key();
        assert.strictEqual(typeof idempotency_key, 'string');
        assert.strictEqual(idempotency_key.length, 36);
    });

    it.only('reject malformed json', async function () {
        const malformed_json = '{"key": "value';
        const result = await circle_integration_client.call_circle_api('/purchase', malformed_json);
        assert(result.hasOwnProperty('error'));
        assert.strictEqual(result.error, 'Malformed Body');
    });

    it.only('reject body to large', async function () {
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