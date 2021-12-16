const host = 'dev.circle-integration.neondistrict.io';
const port = 8443;
const server_url = `https://${host}:${port}`;

module.exports = config = {
    host: host,
    port: port,
    server_url: server_url,
    sns_endpoint: '/aws_sns3'
};