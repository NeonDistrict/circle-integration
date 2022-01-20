const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const setup_notifications_subscription = require('./server/setup_notification_subscription.js');
const on_notification = require('./server/on_notification.js');
const get_public_key = require('./server/get_public_key.js');
const list_sale_items = require('./server/list_sale_items.js');
const purchase = require('./server/purchase.js');

module.exports = create_server = (config, postgres, cb) => {
    const respond = (res, error, body) => {
        if (error) {
            res.status(500);
            return res.send(error);
        }
        res.status(200);
        return res.send(body);
    };

    const parse_body = (req, res, next) => {
        let body_length = 0;
        let data_ended = false;
        const body_parts = [];
        req.on('data', (chunk) => {
            if (data_ended) {
                return;
            } 
            if (body_length + chunk.length > config.max_body_length) {
                data_ended = true;
                return respond(res, {
                    error: 'Body Too Large'
                });
            }
            body_length += chunk.length;
            body_parts.push(chunk);
        });
        req.on('end', function(){
            if (data_ended) {
                return;
            } 
            data_ended = true;
            const raw_body = body_parts.join('');
            let parsed_body = null;
            try {
                parsed_body = JSON.parse(raw_body);
            } catch (error) {
                return respond(res, {
                    error: 'Malformed Body'
                });
            }
            req.body = parsed_body;
            return next();
        })
    };

    const app = express();
    app.use(parse_body);                      
    
    app.post(config.sns_endpoint, (req, res) => {
        on_notification(req.body, (error) => {
            // if we get an error from aws sns crash, something is very wrong - better down then vulnerable
            if (error) {
                console.log(JSON.stringify(error));
                return process.exit(1);
            }
            return res.end();
        });
    });
    
    app.post('/get_public_key', (req, res) => {
        // false for force refreshing the public key which only happens internally
        get_public_key(config, false, respond.bind(this, res));
    });

    app.post('/get_sale_items', async (req, res) => {
        const sale_items = list_sale_items(config);
        res.send(sale_items);
    });
    
    app.post('/purchase', async (req, res) => {
        return purchase(
            config,
            postgres,
            req.body.client_generated_idempotency_key,
            req.body.encrypted_card_information,
            req.body.name_on_card,
            req.body.city,
            req.body.country,
            req.body.address_line_1,
            req.body.address_line_2,
            req.body.district,
            req.body.postal_zip_code,
            req.body.expiry_month,
            req.body.expiry_year,
            req.body.email, 
            req.body.phone_number, 
            '12345678912345678912345678912345', // session hash
            req.ip,
            req.body.sale_item_key,
            respond.bind(this, res)
        );
    });
    
    app.post('/purchase_history', async (req, res) => {
        res.send({'ni': 'yet'});
    });

    // create the https server, binding the express app
    const https_server = https.createServer({
        key:  fs.readFileSync(path.join(__dirname, '../keys/privkey.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../keys/fullchain.pem')),
    }, app);

    // start the https server
    https_server.listen(config.port, () => {
        
        // once the https server is listening we setup the aws sns subscription
        setup_notifications_subscription(config, config.sns_endpoint_url, (error) => {
            if (error) {
                return cb(error);
            }

            // server fully initialized, callback
            const server = {
                config: config,
                postgres: postgres,
                app: app,
                https_server: https_server,
                shutdown: () => {
                    server.https_server.close();
                    server.circle_integration_server.shutdown();
                }
            };
            return cb(null, server);
        });
    });
};