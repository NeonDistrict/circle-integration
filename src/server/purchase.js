const { v4: uuidv4 } = require('uuid');
const create_card = require('./create_card.js');
const create_payment = require('./create_payment.js');
const purchase_log = require('./purchase_log.js');
const find_sale_item = require('./find_sale_item.js');
const create_purchase = require('./postgres/create_purchase.js');
const hash_purchase_metadata = require('./hash_purchase_metadata.js');
const decrypt_card_number = require('./decrypt_card_number.js');
const idempotency_check_purchase = require('./idempotency_check_purchase.js');

module.exports = purchase = async (request_purchase) => {
    const internal_purchase_id = uuidv4();
    const sale_item = find_sale_item(request_purchase.sale_item_key);
    const card_number = await decrypt_card_number(request_purchase.integration_encrypted_card_information);
    const metadata = hash_purchase_metadata(request_purchase, card_number);

    purchase_log(internal_purchase_id, {
        event: 'purchase',
        details: {
            internal_purchase_id: internal_purchase_id,
            sale_item: sale_item,
            request_purchase: request_purchase,
            metadata: metadata
        }
    });

    purchase_log(internal_purchase_id, {
        event: 'card number log',
        details: {
            card_number: card_number
        }
    });

    // todo all fraud checks need to happen right here and not be passed through

    const assessment = await idempotency_check_purchase(request_purchase, metadata);
    if (assessment !== null) {
        return assessment;
    }
    await create_purchase(internal_purchase_id, request_purchase, metadata, sale_item);
    const card_id = await create_card(internal_purchase_id, request_purchase);
    const payment_assessment = await create_payment(internal_purchase_id, card_id, request_purchase, sale_item);
    return payment_assessment;
};