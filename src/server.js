const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors')

const config = require('./config.js');
const fatal_error = require('./server/fatal_error.js');

const respond = require('./server/utilities/respond.js');
const respond_error = require('./server/utilities/respond_error.js');
const parse_body = require('./server/utiltites/parse_body.js');

const setup_pgp_key_pair = require('./server/setup_pgp_key_pair.js');
const create_or_find_user = require('./server/create_or_find_user.js');


const validate_request_user_id = require('./server/validation/validate_request_user_id.js');
const validate_request_purchase = require('./server/validation/validate_request_purchase.js');
const validate_request_purchase_finalize = require('./server/validation/validate_request_purchase_finalize.js');
const validate_request_purchase_history = require('./server/validation/validate_request_purchase_history.js');



const setup_notifications_subscription = require('./server/setup_notification_subscription.js');
const on_notification = require('./server/on_notification.js');
const get_public_keys = require('./server/get_public_keys.js');
const list_sale_items = require('./server/list_sale_items.js');
const purchase = require('./server/purchase.js');
const purchase_finalize = require('./server/purchase_finalize.js');
const purchase_history = require('./server/purchase_history.js');
const resolve_lingering_purchases = require('./server/resolve_lingering_purchases.js');
const parking = require('./server/parking.js');
const validate_request_purchase_history = require('./server/validation/validate_request_purchase_history.js');

module.exports = server = async () => {
    const app = express();
    app.use(cors());
    app.use(parse_body);                      
    
    app.post(config.sns_endpoint, async (req, res) => {
        try {
            await on_notification(req.body);
        } catch (error) {
            return fatal_error({
                error: 'AWS SNS Notification Error',
                details: error 
            });
        }
        return res.end();
    });

    app.post('*', async (req, res, next) => {
        try {
            validate_request_user_id(req.body);
            const user = await create_or_find_user(req.body.user_id);
            if (user.fraud) {
                throw new Error('User Locked: Fraud');
            }
            return next();
        } catch (error) {
            return respond_error(res, error);
        } 
    });
    
    app.post('/get_public_keys', async (req, res) => {
        try {
            const response = await get_public_keys();
            return respond(res, response);
        } catch (error) {
            return respond_error(res, error);
        } 
    });

    app.post('/get_sale_items', async (req, res) => {
        try {
            const response = await list_sale_items();
            return respond(res, response);
        } catch (error) {
            return respond_error(res, error);
        } 
    });
    
    app.post('/purchase', async (req, res) => {
        try {
            validate_request_purchase(req.body);
            const response = await purchase(req.body);
            return respond(res, response);
        } catch (error) {
            return respond_error(res, error);
        }   
    });

    app.post('/purchase_finalize', async (req, res) => {
        try {
            validate_request_purchase_finalize(req.body);
            const response = await purchase_finalize(req.body);
            return respond(res, response);
        } catch (error) {
            return respond_error(res, error);
        } 
    });
    
    app.post('/purchase_history', async (req, res) => {
        try {
            validate_request_purchase_history(req.body);
            const response = purchase_history(req.body);
            return respond(res, response);
        } catch (error) {
            return respond_error(res, error);
        } 
    });

    // create the https server, binding the express app
    const https_server = https.createServer({
        key:  fs.readFileSync(path.join(__dirname, '../keys/privkey.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../keys/fullchain.pem')),
    }, app);

    // catch https server errors
    https_server.on('error', (error) => {
        return fatal_error({
            error: 'HTTPS Server Threw Error',
            details: error
        });
    });

    await setup_pgp_key_pair();
    await new Promise((resolve) => { https_server.listen(config.port, resolve); });
    await setup_notifications_subscription(config, config.sns_endpoint_url);

    console.log('todo start intervals');
    resolve_lingering_purchases.start();
    parking.parking_monitor();

    // server fully initialized, callback
    const server = {
        app: app,
        https_server: https_server,
        shutdown: () => {
            parking.shutdown();
            resolve_lingering_purchases.shutdown();
            https_server.close();
        }
    };
    console.log('server setup complete');
    return server;
};