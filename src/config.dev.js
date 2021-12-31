const config = {};
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

module.exports = config;