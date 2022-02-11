const config = require('./config.js');
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const fatal_error = require('./server/fatal_error.js');
const generate_pgp_key_pair = require('./server/utilities/generate_pgp_key_pair.js');
const create_or_find_user = require('./server/create_or_find_user.js');
const validate_email = require('./server/validation/validate_email.js');
const validate_expiry_month = require('./server/validation/validate_expiry_month.js');
const validate_expiry_year = require('./server/validation/validate_expiry_year.js');
const validate_ip_address = require('./server/validation/validate_ip_address.js');
const validate_sale_item_key = require('./server/validation/validate_sale_item_key.js');
const validate_sha1_hex = require('./server/validation/validate_sha1_hex.js');
const validate_string = require('./server/validation/validate_string.js');
const validate_uuid = require('./server/validation/validate_uuid.js');
const setup_notifications_subscription = require('./server/setup_notification_subscription.js');
const on_notification = require('./server/on_notification.js');
const get_public_keys = require('./server/get_public_keys.js');
const list_sale_items = require('./server/list_sale_items.js');
const purchase = require('./server/purchase.js');
const purchase_finalize = require('./server/purchase_finalize.js');
const purchase_history = require('./server/purchase_history.js');
const resolve_lingering_purchases = require('./server/resolve_lingering_purchases.js');
const parking = require('./server/parking.js');

module.exports = server = async () => {
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

    // todo all errors should get caught

    app.post('*', async (req, res, next) => {
        validate_uuid(req.body.user_id);
        const user = await create_or_find_user(req.body.user_id);
        req.user = user;
        return next();
    });
    
    app.post('/get_public_keys', async (req, res) => {
        const response = await get_public_keys();
        return respond(res, response);
    });

    app.post('/get_sale_items', async (req, res) => {
        const response = await list_sale_items();
        return respond(res, response);
    });
    
    app.post('/purchase', async (req, res) => {
        validate_uuid(req.body.client_generated_idempotency_key);
        validate_string(req.body.circle_public_key_id);
        validate_string(req.body.circle_encrypted_card_information);
        validate_string(req.body.integration_encrypted_card_information);
        validate_string(req.body.name_on_card);
        validate_string(req.body.city);
        validate_string(req.body.country);
        validate_string(req.body.address_line_1);
        validate_string(req.body.address_line_2);
        validate_string(req.body.district);
        validate_string(req.body.postal_zip_code);
        validate_expiry_month(req.body.expiry_month);
        validate_expiry_year(req.body.expiry_year);
        validate_email(req.body.email);
        validate_string(req.body.phone_number);
        validate_sha1_hex(req.body.metadata_hash_session_id);
        validate_ip_address(req.body.ip_address);
        validate_sale_item_key(req.body.sale_item_key);
        const response = await purchase(
            req.user.user_id,
            req.body.client_generated_idempotency_key,
            req.body.circle_public_key_id,
            req.body.circle_encrypted_card_information,
            req.body.integration_encrypted_card_information,
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
            req.body.metadata_hash_session_id,
            req.body.ip_address,
            req.body.sale_item_key
        );
        return respond(res, response);
    });

    app.post('/purchase_finalize', async (req, res) => {
        validate_uuid(req.body.internal_purchase_id);
        validate_uuid(req.body.payment_id);
        const response = await purchase_finalize(
            req.user.user_id,
            req.body.internal_purchase_id,
            req.body.payment_id
        );
        return respond(res, response);
    });
    
    app.post('/purchase_history', async (req, res) => {
        validate_uuid(req.body.user_id);
        validate_skip(req.body.skip);
        validate_limit(req.body.limit);
        if (limit > config.max_pagination_limit) {
            // todo this could be in the limit validator actually
            throw new Error('Limit Too Large, Maximum: ' + config.max_pagination_limit);
        }
        const response = purchase_history(
            req.user.user_id,
            req.body.skip,
            req.body.limit
        );
        return respond(res, response);
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

    // generate the pgp keypair
    console.log('generating pgp keypair');
    try {
        const pgp_keypair = await generate_pgp_key_pair();
        config.pgp_passphrase = pgp_keypair.passphrase;
        config.pgp_private_key = pgp_keypair.private_key;
        config.pgp_public_key = pgp_keypair.public_key;
    } catch (error) {
        return fatal_error({
            error: 'Generate PGP Keypair Threw Error',
            details: error
        });
    }
    
    // start the https server
    console.log('https listen');
    await new Promise((resolve) => {
        https_server.listen(config.port, resolve);
    });
        
    // once the https server is listening we setup the aws sns subscription
    console.log('setup notification subscription');
    try {
        await setup_notifications_subscription(config, config.sns_endpoint_url);
    } catch (error) {
        return fatal_error({
            error: 'Setup Notifications Subscription Threw Error',
            details: error
        });
    }

    console.log('start intervals');
    resolve_lingering_purchases.start();
    parking.parking_monitor();

    // server fully initialized, callback
    const server = {
        app: app,
        https_server: https_server,
        shutdown: async () => {
            server.https_server.close((error) => {
                return fatal_error({
                    error: 'HTTPS Server Close Threw Error',
                    details: error
                });
            });
            parking.shutdown();
            resolve_lingering_purchases.shutdown();
        }
    };
    console.log('server setup complete');
    return server;
};