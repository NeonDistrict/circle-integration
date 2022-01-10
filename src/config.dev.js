const config = {};
config.max_body_length = 5000;
config.host = 'dev.circle-integration.neondistrict.io';
config.port = 8443;
config.server_url = `https://${config.host}:${config.port}`;
config.sns_endpoint = '/aws_sns3';
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

module.exports = config;