const http = require('http');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const sha1 = require('../server/utilities/sha1.js');
const axios = require('axios').default.create();
const get_public_keys = require('./server/get_public_keys.js');
const list_sale_items = require('./server/list_sale_items.js');
const purchase = require('./server/purchase.js');
const purchase_finalize = require('./server/purchase_finalize.js');
const purchase_history = require('./server/purchase_history.js');
const port = 21212;
const config = require('../config.dev.js');
const fake_user_id = uuidv4();
const fake_metadata_hash_session_id = sha1(uuidv4());

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

    const post_circle_integration = async (endpoint, data, cb) => {
        if (!data) {
            throw new Error('Data Required');
        }
        const request = {
            method: 'post',
            url: `${config.server_url}${endpoint}`,
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors',
            data: data
        };
        let response;
        try {
            response = await axios(request);
        } catch (request_error) {
            return cb(request_error.response.data);
        }
        return cb(null, response.data);
    };

    const app = express();
    app.use(express.static('static'));
    app.use(parse_body);                      
    
    app.post('/get_public_keys', async (req, res) => {
        post_circle_integration('/get_public_keys', {
            user_id: fake_user_id
        }, (error, circle_integration_response) => {
            respond(res, error, circle_integration_response);
        });
    });

    app.post('/get_sale_items', async (req, res) => {
        post_circle_integration('/get_sale_items', {
            user_id: fake_user_id
        }, (error, circle_integration_response) => {
            respond(res, error, circle_integration_response);
        });
    });
    
    app.post('/purchase', async (req, res) => {
        post_circle_integration('/purchase', {
            user_id: fake_user_id,
            client_generated_idempotency_key: req.body.client_generated_idempotency_key,
            circle_public_key_id: req.body.circle_public_key_id,
            circle_encrypted_card_information: req.body.circle_encrypted_card_information,
            integration_encrypted_card_information: req.body.integration_encrypted_card_information,
            name_on_card: req.body.name_on_card,
            city: req.body.city,
            country: req.body.country,
            address_line_1: req.body.address_line_1,
            address_line_2: req.body.address_line_2,
            district: req.body.district,
            postal_zip_code: req.body.postal_zip_code,
            expiry_month: req.body.expiry_month,
            expiry_year: req.body.expiry_year,
            email: req.body.email, 
            phone_number: req.body.phone_number, 
            metadata_hash_session_id: fake_metadata_hash_session_id,
            ip_address: //req.body.ip_address,
            sale_item_key: req.body.sale_item_key
        }, (error, circle_integration_response) => {
            respond(res, error, circle_integration_response);
        });
    });

    app.post('/purchase_finalize', async (req, res) => {
        post_circle_integration('/purchase_finalize', {
            user_id: fake_user_id,
            internal_purchase_id: req.body.internal_purchase_id,
            payment_id: req.body.payment_id
        }, (error, circle_integration_response) => {
            respond(res, error, circle_integration_response);
        });
    });
    
    app.post('/purchase_history', async (req, res) => {
        post_circle_integration('/purchase_history', {
            user_id: fake_user_id,
            skip: req.body.skip,
            limit: req.body.limit
        }, (error, circle_integration_response) => {
            respond(res, error, circle_integration_response);
        });
    });

    const http_server = http.createServer(app);
    http_server.listen(port, () => {
        console.log('demo listening on port: ' + port);
        return cb(null, server);
    });
};