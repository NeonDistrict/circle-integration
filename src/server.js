const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const log = require('./server/utilities/log.js');
const config = require('./config.js');
const parse_body = require('./server/utilities/parse_body.js');
const setup_pgp_key_pair = require('./server/utilities/setup_pgp_key_pair.js');
const setup_notifications_subscription = require('./server/utilities/setup_notification_subscription.js');
const resolve_lingering_purchases = require('./server/purchase/resolve_lingering_purchases.js');
const parking = require('./server/utilities/parking.js');
const mount = require('./server/endpoints/mount.js');
const mount_wildcard = require('./server/endpoints/mount_wildcard.js');

module.exports = async () => {
    log({
        event: 'server setup begin'
    });

    const app = express();
    
    app.use(cors());
    app.use(parse_body);        

    mount(app, 'post', config.sns_endpoint, path.join(__dirname, '/server/endpoints/sns_notification'));
    mount_wildcard(app, 'post', '/crm/*', path.join(__dirname, '/server/endpoints/crm/authenticate'));
    mount(app, 'post', '/crm/user/get', path.join(__dirname, '/server/endpoints/crm/user/get'));
    mount(app, 'post', '/crm/user/fraud/list', path.join(__dirname, '/server/endpoints/crm/user/fraud/list'));
    mount(app, 'post', '/crm/purchase/get', path.join(__dirname, '/server/endpoints/crm/purchase/get'));
    mount(app, 'post', '/crm/purchase/user/list', path.join(__dirname, '/server/endpoints/crm/purchase/user/list'));
    mount(app, 'post', '/crm/purchase/fraud/list', path.join(__dirname, '/server/endpoints/crm/purchase/fraud/list'));
    mount(app, 'post', '/crm/payment/get', path.join(__dirname, '/server/endpoints/crm/payment/get'));
    mount(app, 'post', '/crm/payment/refund', path.join(__dirname, '/server/endpoints/crm/payment/refund'));
    mount(app, 'post', '/crm/payment/cancel', path.join(__dirname, '/server/endpoints/crm/payment/cancel'));
    mount_wildcard(app, 'post', '*', path.join(__dirname, '/server/endpoints/authenticate'));
    mount(app, 'post', '/get_public_keys', path.join(__dirname, '/server/endpoints/get_public_keys'));
    mount(app, 'post', '/get_sale_items',  path.join(__dirname, '/server/endpoints/get_sale_items'));
    mount(app, 'post', '/purchase/create', path.join(__dirname, '/server/endpoints/purchase/create'));
    mount(app, 'post', '/purchase/finalize', path.join(__dirname, '/server/endpoints/purchase/finalize'));
    mount(app, 'post', '/purchase/history', path.join(__dirname, '/server/endpoints/purchase/history'));

    const https_server = https.createServer({
        key:  fs.readFileSync(path.join(__dirname, '../keys/privkey.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../keys/fullchain.pem')),
    }, app);

    https_server.on('error', (error) => {
        log({
            event: 'https server error',
            error: error
        }, true);
        throw new Error('Internal Server Error');
    });

    await setup_pgp_key_pair();
    await new Promise((resolve) => { https_server.listen(config.port, resolve); });
    await setup_notifications_subscription(config, config.sns_endpoint_url);
    resolve_lingering_purchases.start();
    parking.parking_monitor();

    const server = {
        app: app,
        https_server: https_server,
        shutdown: () => {
            log({
                event: 'server shutting down'
            });
            parking.shutdown();
            resolve_lingering_purchases.shutdown();
            https_server.close();
        }
    };
    log({
        event: 'server setup complete'
    });
    return server;
};
