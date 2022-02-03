const http = require('http');
const express = require('express');
const axios 
const get_public_keys = require('./server/get_public_keys.js');
const list_sale_items = require('./server/list_sale_items.js');
const purchase = require('./server/purchase.js');
const purchase_finalize = require('./server/purchase_finalize.js');
const purchase_history = require('./server/purchase_history.js');
const port = 21212;
const circle_integration_url = 'https://';

const fake_user_id = uuidv4();
const fake_session_hash = sha();

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
    app.use(express.static('static'));
    app.use(parse_body);                      
    
    app.post('/get_public_keys', (req, res) => {

        get_public_keys(config, respond.bind(this, res));
    });

    app.post('/get_sale_items', async (req, res) => {
        const sale_items = list_sale_items(config);
        res.send(sale_items);
    });
    
    app.post('/purchase', async (req, res) => {
        return purchase(
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
            req.body.sale_item_key,
            respond.bind(this, res)
        );
    });

    app.post('/purchase_finalize', async (req, res) => {
        if (!is_valid_uuid(req.body.internal_purchase_id)) {
            return respond(res, {
                error: 'Invalid internal_purchase_id'
            });
        }
        if (!is_valid_uuid(req.body.payment_id)) {
            return respond(res, {
                error: 'Invalid payment_id'
            });
        }
        return purchase_finalize(
            config,
            postgres,
            req.user.user_id,
            req.body.internal_purchase_id,
            req.body.payment_id,
            respond.bind(this, res)
        );
    });
    
    app.post('/purchase_history', async (req, res) => {
        return purchase_history(
            config,
            postgres,
            req.user.user_id,
            req.body.skip,
            req.body.limit,
            respond.bind(this, res)
        );
    });

    const http_server = http.createServer(app);
    http_server.listen(port, () => {
        console.log('demo listening on port: ' + port);
        return cb(null, server);
    });
};