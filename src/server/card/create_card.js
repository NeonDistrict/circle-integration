const { v4: uuidv4 } = require('uuid');
const call_circle = require('../utilities/call_circle.js');
const assess_create_card_result = require('./assess_create_card_result.js');
const purchase_log = require('../utilities/purchase_log.js');
const create_card_start = require('../postgres/create_card_start.js');

module.exports = create_card = async (internal_purchase_id, request_purchase) => {
    purchase_log(internal_purchase_id, {
        event: 'create_card',
        details: {
            internal_purchase_id: internal_purchase_id,
            request_purchase: request_purchase
        }
    });
    const create_card_idempotency_key = uuidv4();
    await create_card_start(internal_purchase_id, create_card_idempotency_key);
    const circle_create_card_request = {
        idempotencyKey: create_card_idempotency_key,
        keyId: request_purchase.circle_public_key_id,
        encryptedData: request_purchase.circle_encrypted_card_information,
        billingDetails: {
            name: request_purchase.name_on_card,
            city: request_purchase.city,
            country: request_purchase.country,
            line1: request_purchase.address_line_1,
            line2: request_purchase.address_line_2,
            district: request_purchase.district,
            postalCode: request_purchase.postal_zip_code
        },
        expMonth: request_purchase.expiry_month,
        expYear: request_purchase.expiry_year,
        metadata: {
            email: request_purchase.email,
            phoneNumber: request_purchase.phone_number,
            sessionId: request_purchase.metadata_hash_session_id,
            ipAddress: request_purchase.ip_address
        }
    };
    const create_card_result = await call_circle(internal_purchase_id, [201], 'post', `/cards`, circle_create_card_request);
    return await assess_create_card_result(internal_purchase_id, request_purchase.user_id, create_card_result);
};