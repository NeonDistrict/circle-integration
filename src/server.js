const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const body_parser = require('body-parser')
const app = express();
const circle_integration_server = require('./circle_integration_server.js');

module.exports = server = {
    https_server: null,
    respond: (res, error, body) => {
        if (error) {
            res.status(500);
            return res.send(error);
        }
        res.status(200);
        return res.send(body);
    },
    initialize: async (config, cb) => {
        app.use(body_parser.json({
            type (req) {
                return true;
            }
        }));

        // todo there should be some json schema validation here, and error responses, logging etc
        // todo generic responders
        
        // todo which means we need to slow check any calls and cleanup callbacks
        // maybe we do an abstract service that handles all of that shit
        
        app.post(config.sns_endpoint, async (req, res) => {
            circle_integration_server.on_notification(req.body, (error) => {
                if (error) {
                    console.log(error, JSON.stringify(error));
                    return process.exit(1);
                }
                return res.end();
            });
        });
        
        app.post('/get_public_key', (req, res) => {
            let force_refresh = false;
            circle_integration_server.get_public_key(force_refresh, server.respond.bind(this, res));
        });

        app.post('/get_sale_items', async (req, res) => {
            const sale_items = await circle_integration_server.get_sale_items(req.user_id);
            res.send(sale_items);
        });
        
        app.post('/purchase', async (req, res) => {
            return circle_integration_server.purchase(
                req.body.idempotency_key,
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
                '192.166.43.2', //req.ip,
                req.body.sale_item_key,
                server.respond.bind(this, res)
            );
        });
        
        app.post('/purchase_history', async (req, res) => {
            const purchase_history_page = await circle_integration_server.purchase_history(req.user_id, req.after_id);
            res.send(purchase_history_page);
        });
        
        server.https_server = https.createServer({
            key: fs.readFileSync(path.join(__dirname, '../keys/privkey.pem')),
            cert: fs.readFileSync(path.join(__dirname, '../keys/fullchain.pem')),
        }, app);

        // start the server
        server.https_server.listen(config.port, () => {
            const sns_endpoint_url = `${config.server_url}${config.sns_endpoint}`;
            circle_integration_server.setup_notifications_subscription(sns_endpoint_url, cb);
        });
    },
    shutdown: () => {
        server.https_server.close();
    }
};