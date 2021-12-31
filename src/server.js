const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const body_parser = require('body-parser');
const create_circle_integration_server = require('./circle_integration_server.js');

module.exports = create_server = (config, cb) => {
    const respond = (res, error, body) => {
        if (error) {
            res.status(500);
            return res.send(error);
        }
        res.status(200);
        return res.send(body);
    };

    const circle_integration_server = create_circle_integration_server(config);
    const app = express();

    // aws sns calls specify the mime type as plaintext so the body parser wont pick them up
    // the type(req) here just says to always parse the body as json
    // todo: what happens on non-json bodies? need to test this
    app.use(body_parser.json({
        type (req) {
            return true;
        }
    }));
    
    app.post(config.sns_endpoint, (req, res) => {
        circle_integration_server.on_notification(req.body, (error) => {
            // if we get an error from aws sns crash, something is very wrong - better down then vulnerable
            if (error) {
                console.log(JSON.stringify(error));
                return process.exit(1);
            }
            return res.end();
        });
    });
    
    app.post('/get_public_key', (req, res) => {
        circle_integration_server.get_public_key(req.body.force_refresh, respond.bind(this, res));
    });

    app.post('/get_sale_items', async (req, res) => {
        const sale_items = await circle_integration_server.get_sale_items(req.user_id);
        res.send(sale_items);
    });
    
    app.post('/purchase', async (req, res) => {
        return circle_integration_server.purchase(
            req.body.idempotency_key,
            req.body.verification_type,
            req.body.encrypted_card_information,
            req.body.hashed_card_details,
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
        const purchase_history_page = await circle_integration_server.purchase_history(req.user_id, req.after_id);
        res.send(purchase_history_page);
    });

    // create the https server, binding the express app
    const https_server = https.createServer({
        key: fs.readFileSync(path.join(__dirname, '../keys/privkey.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../keys/fullchain.pem')),
    }, app);

    // start the https server
    https_server.listen(config.port, () => {
        
        // once the https server is listening we setup the aws sns subscription
        const sns_endpoint_url = `${config.server_url}${config.sns_endpoint}`;
        circle_integration_server.setup_notifications_subscription(sns_endpoint_url, (error) => {
            if (error) {
                return cb(error);
            }

            // server fully initialized, callback
            const server = {
                config: config,
                circle_integration_server: circle_integration_server,
                app: app,
                https_server: https_server,
                shutdown: () => {
                    server.https_server.close();
                }
            };
            return cb(null, server);
        });
    });
};