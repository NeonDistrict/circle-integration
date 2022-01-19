const call_circle = require('./call_circle.js');
const assess_payment_result = require('./assess_payment_result.js');
const api_uri_base = 'https://api-sandbox.circle.com/v1/';
// todo shoul dbe in config

module.exports = create_payment = (
    payment_idempotency_key, 
    verification_type, 
    card_id, 
    encrypted_card_information, 
    email, 
    phone_number, 
    session_id, 
    ip_address, 
    sale_item, 
    cb
) => {
    const request_body = {
        idempotencyKey: payment_idempotency_key,
        keyId: encrypted_card_information.keyId,
        metadata: {
            email: email,
            phoneNumber: phone_number,
            sessionId: session_id,
            ipAddress: ip_address,
        },
        amount: {
            amount: sale_item.amount,
            currency: sale_item.currency
        },
        autoCapture: true,
        verification: verification_type,
        verificationSuccessUrl: config.three_d_secure_success_url,
        verificationFailureUrl: config.three_d_secure_failure_url,
        source: {
            id: card_id,
            type: 'card'
        },
        description: sale_item.statement_description,
        encryptedData: encrypted_card_information.encryptedMessage
    };

    // create the payment
    call_circle([201], 'post', `${api_uri_base}payments`, request_body, (error, payment_result) => {
        if (error) {
            return cb(error);
        }

        // determine the payment outcome, waiting on sns if needed
        assess_payment_result(payment_result, (error, assessed_payment_result) => {
            if (error) {
                return cb(error);
            }
            // todo record success or failure here for fraud
            return cb(null, assessed_payment_result);
        });
    });
};