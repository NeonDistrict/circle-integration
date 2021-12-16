const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan_body = require('morgan-body');
const body_parser = require('body-parser')
const app = express();
const circle_integration = require('./circle_integration_server.js');

module.exports = server = {
    initialize: (config, callback) => {
        app.use(body_parser.json({
            type (req) {
                return true;
            }
        }));
        
        const express_log_stream = fs.createWriteStream(path.join(__dirname, 'express.log'), { flags: 'a' });
        morgan_body(app, { stream: express_log_stream, noColors: true });
        
        // todo there should be some json schema validation here, and error responses, logging etc
        // todo generic responders
        
        // todo cant rely on waiting for sub conf to start endpoints
        // todo which means we need to slow check any calls and cleanup callbacks
        // maybe we do an abstract service that handles all of that shit
        
        app.post(config.sns_endpoint, async (req, res) => {
            ({ error } = await circle_integration.on_notification(req.body));
            if (error) {
                throw error;
            }
            res.end();
        });
        
        app.post('/get_public_key', async (req, res) => {
            const public_key = await circle_integration.get_public_key();
            res.send(public_key);
        });
        
        app.post('/check_purchase_limit', async (req, res) => {
            const purchase_limit = await circle_integration.check_purchase_limit(req.user_id);
            res.send(purchase_limit);
        });
        
        app.post('/get_sale_items', async (req, res) => {
            const sale_items = await circle_integration.get_sale_items(req.user_id);
            res.send(sale_items);
        });
        
        app.post('/purchase', async (req, res) => {
            // todo this card packet needs a lot of detail
            const receipt = await circle_integration.purchase(req.user_id, req.sale_item_id, req.card);
            res.send(receipt);
        });
        
        app.post('/purchase_history', async (req, res) => {
            const purchase_history_page = await circle_integration.purchase_history(req.user_id, req.after_id);
            res.send(purchase_history_page);
        });
        
        const https_server = https.createServer({
            key: fs.readFileSync('./circle-integration/keys/privkey.pem'),
            cert: fs.readFileSync('./circle-integration/keys/fullchain.pem'),
        }, app);

        // start the server
        https_server.listen(config.port, async () => {
            const sns_endpoint_url = `${config.server_url}${config.sns_endpoint}`;
            ({ error } = await circle_integration.setup_notifications_subscription(sns_endpoint_url));
            callback(error);
        });
    }
};