const config = {};

config.dangerous = true;
config.max_body_length = 5000;
config.public_key_cache_duration = 1000 * 60 * 60 * 24; // 24 hours

config.api_sandbox_key = 'QVBJX0tFWTozZjk5YzRmMDdlZjJlM2RkNjlmNjVmNzk5YjU5YjE2NzowODc0NDVhMzk1NjY3YjU2MWY4OTBjODk1NjVlMTg3Mg==';
config.api_uri_base = 'https://api-sandbox.circle.com/v1/';
config.host = 'dev.circle-integration.neondistrict.io';
config.port = 8443;
config.server_url = `https://${config.host}:${config.port}`;
config.sns_endpoint = '/aws_sns3';
config.sns_endpoint_url = `${config.server_url}${config.sns_endpoint}`;

config.three_d_secure_server_port = 8444;
config.three_d_secure_server_url = `https://${config.host}:${config.three_d_secure_server_port}`;
config.three_d_secure_success_endpoint = '/success';
config.three_d_secure_failure_endpoint = '/failure';
config.three_d_secure_success_url = `${config.three_d_secure_server_url}${config.three_d_secure_success_endpoint}`;
config.three_d_secure_failure_url = `${config.three_d_secure_server_url}${config.three_d_secure_failure_endpoint}`;

config.postgres_user = 'ndcircledev';
config.postgres_host = 'neon-district-circle-integration-dev.csru6sqg3mle.us-east-1.rds.amazonaws.com';
config.postgres_database = 'circle';
config.postgres_password = 'RKuwN63jVBEZqU';
config.postgres_port = '5432';

const test_amounts = require('./test/test_amounts.js');
const sale_items = [
    {
        "sale_item_key": "NEON_1000",
        "currency": "USD",
        "sale_item_price": "1.00",
        "statement_description": "NEON DISTRICT: 1000 NEON",
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