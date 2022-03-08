const fs = require('fs');

const config = {};

config.app_name = 'circle-integration-dev'; // used by logging to papertrail
config.dangerous = true;
config.max_body_length = 5000;
config.max_pagination_limit = 100;
config.public_key_cache_duration = 60000 * 60 * 24; // 24 hours
config.purchase_lingering_after = 60000 * 60; // 1 hour
config.resolve_lingering_purchases_loop_time = 60000; // 60s
config.parking_monitor_loop_time = 60000; // 60s
config.parking_abandoned_time = 60000 * 30; // 30m

config.purchase_limits = {
    daily: 50,
    weekly: 200,
    monthly: 500
};

config.from_email = 'noreply@neondistrict.io';
config.email_keys = require('../keys/email_keys.js');

config.circle_key = fs.readFileSync('./keys/circle_key_dev', 'utf8');
config.api_uri_base = 'https://api-sandbox.circle.com/v1';
config.host = 'dev.circle-integration.neondistrict.io';
config.port = 8443;
config.server_url = `https://${config.host}:${config.port}`;
config.sns_endpoint = '/aws_sns4';
config.sns_endpoint_url = `${config.server_url}${config.sns_endpoint}`;

config.postgres = require('../keys/postgres_dev.js');

config.three_d_secure_server_port = 8444;
config.three_d_secure_server_url = `https://${config.host}:${config.three_d_secure_server_port}`;
config.three_d_secure_success_endpoint = '/success';
config.three_d_secure_failure_endpoint = '/failure';
config.three_d_secure_success_url = `${config.three_d_secure_server_url}${config.three_d_secure_success_endpoint}`;
config.three_d_secure_failure_url = `${config.three_d_secure_server_url}${config.three_d_secure_failure_endpoint}`;

const test_amounts = require('./test/test_amounts.js');
const sale_items = [
    {
        "sale_item_key": "NEON_1000",
        "currency": "USD",
        "sale_item_price": "1.00",
        "statement_description": "NEON DISTRICT: 1000 NEON",
        "store_description": "Adds 1000 NEON to your account.",
        "store_image": "https://images/NEON_1000.png"
    },
    {
        "sale_item_key": "TEST_CVV",
        "currency": "USD",
        "sale_item_price": "1.00",
        "statement_description": "NEON DISTRICT: TEST CVV",
        "store_description": "Adds 1000 NEON to your account.",
        "store_image": "https://images/NEON_1000.png"
    },
    {
        "sale_item_key": "TEST_UNSECURE",
        "currency": "USD",
        "sale_item_price": "1.00",
        "statement_description": "NEON DISTRICT: TEST UNSECURE",
        "store_description": "Adds 1000 NEON to your account.",
        "store_image": "https://images/NEON_1000.png"
    }
];
for (const test_amount_key in test_amounts) {
    test_amount = test_amounts[test_amount_key];
    sale_items.push({
        "sale_item_key": test_amount_key,
        "currency": "USD",
        "sale_item_price": test_amount.amount,
        "statement_description": `NEON DISTRICT: ${test_amount_key}`,
        "store_description": test_amount.description,
        "store_image": `https://images/${test_amount_key}.png`
    });
}

config.sale_items = sale_items;

module.exports = config;