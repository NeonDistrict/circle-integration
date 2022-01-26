const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const fatal_error = require('./server/fatal_error.js');
const generate_pgp_key_pair = require('./server/utilities/generate_pgp_key_pair.js');
const create_or_find_user = require('./server/create_or_find_user.js');
const is_valid_email = require('./validation/is_valid_email.js');
const is_valid_expiry_month = require('./validation/is_valid_expiry_month.js');
const is_valid_expiry_year = require('./validation/is_valid_expiry_year.js');
const is_valid_ip_address = require('./validation/is_valid_ip_address.js');
const is_valid_sale_item_key = require('./validation/is_valid_sale_item_key.js');
const is_valid_sha512_hex = require('./validation/is_valid_sha512_hex.js');
const is_valid_string = require('./validation/is_valid_string.js');
const is_valid_uuid = require('./validation/is_valid_uuid.js');
const setup_notifications_subscription = require('./server/setup_notification_subscription.js');
const on_notification = require('./server/on_notification.js');
const get_public_keys = require('./server/get_public_keys.js');
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
            if (error) {
                return fatal_error({
                    error: 'AWS SNS Notification Error',
                    details: error 
                });
            }
            return res.end();
        });
    });

    app.post('*', (req, res, next) => {
        if (!is_valid_uuid(req.body.user_id)) {
            return respond(res, {
                error: 'Invalid user_id'
            });
        }
        create_or_find_user(config, postgres, req.body.user_id, (error, user) => {
            if (error) {
                return respond(res, error);
            }
            req.user = user;
            return next();
        });
    });
    
    app.post('/get_public_keys', (req, res) => {
        get_public_keys(config, respond.bind(this, res));
    });

    app.post('/get_sale_items', async (req, res) => {
        const sale_items = list_sale_items(config);
        res.send(sale_items);
    });
    
    app.post('/purchase', async (req, res) => {
        if (!is_valid_uuid(req.body.client_generated_idempotency_key)) {
            return respond(res, {
                error: 'Invalid client_generated_idempotency_key'
            });
        }
        if (!is_valid_string(req.body.circle_public_key_id)) {
            return respond(res, {
                error: 'Invalid circle_public_key_id'
            });
        }
        if (!is_valid_string(req.body.circle_encrypted_card_information)) {
            return respond(res, {
                error: 'Invalid circle_encrypted_card_information'
            });
        }
        if (!is_valid_string(req.body.integration_encrypted_card_information)) {
            return respond(res, {
                error: 'Invalid integration_encrypted_card_information'
            });
        }
        if (!is_valid_string(req.body.name_on_card)) {
            return respond(res, {
                error: 'Invalid name_on_card'
            });
        }
        if (!is_valid_string(req.body.city)) {
            return respond(res, {
                error: 'Invalid city'
            });
        }
        if (!is_valid_string(req.body.country)) {
            return respond(res, {
                error: 'Invalid country'
            });
        }
        if (!is_valid_string(req.body.address_line_1)) {
            return respond(res, {
                error: 'Invalid address_line_1'
            });
        }
        if (!is_valid_string(req.body.address_line_2)) {
            return respond(res, {
                error: 'Invalid address_line_2'
            });
        }
        if (!is_valid_string(req.body.district)) {
            return respond(res, {
                error: 'Invalid district'
            });
        }
        if (!is_valid_string(req.body.postal_zip_code)) {
            return respond(res, {
                error: 'Invalid postal_zip_code'
            });
        }
        if (!is_valid_expiry_month(req.body.expiry_month)) {
            return respond(res, {
                error: 'Invalid expiry_month'
            });
        }
        if (!is_valid_expiry_year(req.body.expiry_year)) {
            return respond(res, {
                error: 'Invalid expiry_year'
            });
        }
        if (!is_valid_email(req.body.email)) {
            return respond(res, {
                error: 'Invalid email'
            });
        }
        if (!is_valid_string(req.body.phone_number)) {
            return respond(res, {
                error: 'Invalid phone_number'
            });
        }
        if (!is_valid_sha512_hex(req.body.session_hash)) {
            return respond(res, {
                error: 'Invalid session_hash'
            });
        }
        if (!is_valid_ip_address(req.body.ip_address)) {
            return respond(res, {
                error: 'Invalid ip_address'
            });
        }
        if (!is_valid_sale_item_key(req.body.sale_item_key)) {
            return respond(res, {
                error: 'Invalid sale_item_key'
            });
        }

        return purchase(
            config,
            postgres,
            req.body.user,
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
            req.body.session_hash,
            req.body.ip_address,
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

    // catch https server errors
    https_server.on('error', (error) => {
        return fatal_error({
            error: 'HTTPS Server Threw Error',
            details: error
        });
    });

    // generate the pgp keypair
    generate_pgp_key_pair((error, pgp_passphrase, pgp_private_key, pgp_public_key) => {
        if (error) {
            return cb(error);
        }
        config.pgp_passphrase = pgp_passphrase;
        config.pgp_private_key = pgp_private_key;
        config.pgp_public_key = pgp_public_key;
    
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
    });
};