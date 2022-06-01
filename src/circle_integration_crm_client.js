const config = require('./config.js');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios').default.create();

module.exports = circle_integration_crm_client = {
    generate_idempotency_key: () => {
        return uuidv4();
    },

    call_circle_api: async (endpoint, data) => {
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
            if (request_error.response.data) {
                return request_error.response.data;
            }

            throw new Error("Server Error");
        }

        const response_body = response.data;
        return response_body;
    },

    user_get: async (user_id) => {
        return await circle_integration_crm_client.call_circle_api('/crm/user/get', {
            user_id: user_id
        });
    },

    user_fraud_list: async (limit, skip) => {
        return await circle_integration_crm_client.call_circle_api('/crm/user/fraud/list', {
            limit: limit,
            skip: skip
        });
    },

    purchase_fraud_list: async (limit, skip) => {
        return await circle_integration_crm_client.call_circle_api('/crm/purchase/fraud/list', {
            limit: limit,
            skip: skip
        });
    },

    purchase_get: async (internal_purchase_id) => {
        return await circle_integration_crm_client.call_circle_api('/crm/purchase/get', {
            internal_purchase_id: internal_purchase_id
        });
    },

    purchase_user_list: async (user_id, limit, skip) => {
        return await circle_integration_crm_client.call_circle_api('/crm/purchase/user/list', {
            user_id: user_id,
            limit: limit,
            skip: skip
        });
    },

    payment_get: async (payment_id) => {
        return await circle_integration_crm_client.call_circle_api('/crm/payment/get', {
            payment_id: payment_id
        });
    },

    payment_refund: async (internal_purchase_id, payment_id, reason) => {
        return await circle_integration_crm_client.call_circle_api('/crm/payment/refund', {
            idempotency_key: circle_integration_crm_client.generate_idempotency_key(),
            internal_purchase_id: internal_purchase_id,
            payment_id: payment_id,
            reason: reason
        });
    },

    payment_cancel: async (internal_purchase_id, payment_id, reason) => {
        return await circle_integration_crm_client.call_circle_api('/crm/payment/cancel', {
            idempotency_key: circle_integration_crm_client.generate_idempotency_key(),
            internal_purchase_id: internal_purchase_id,
            payment_id: payment_id,
            reason: reason
        });
    }
};