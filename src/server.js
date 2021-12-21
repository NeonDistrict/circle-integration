const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const body_parser = require('body-parser')
const app = express();
const circle_integration_server = require('./circle_integration_server.js');

module.exports = server = {
    https_server: null,
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
            ({ error } = await circle_integration_server.on_notification(req.body));
            if (error) {
                throw error;
            }
            res.end();
        });
        
        app.post('/get_public_key', (req, res) => {
            let force_refresh = false;
            circle_integration_server.get_public_key(force_refresh, (error, public_key) => {
                if (error) {
                    return res.send(error);
                }
                return res.send(public_key);
            });
        });
        
        app.post('/check_purchase_limit', async (req, res) => {
            const purchase_limit = await circle_integration_server.check_purchase_limit(req.user_id);
            res.send(purchase_limit);
        });
        
        app.post('/get_sale_items', async (req, res) => {
            const sale_items = await circle_integration_server.get_sale_items(req.user_id);
            res.send(sale_items);
        });
        
        app.post('/purchase', async (req, res) => {
            // todo this card packet needs a lot of detail
            const receipt = await circle_integration_server.purchase(req.user_id, req.sale_item_id, req.card);
            res.send(receipt);
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