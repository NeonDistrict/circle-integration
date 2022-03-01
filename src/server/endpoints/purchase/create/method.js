const { v4: uuidv4 } = require('uuid');
const log = require('../../../utilities/log.js');
const create_card = require('../../../card/create_card.js');
const create_payment = require('../../../payment/create_payment.js');
const find_sale_item = require('../../../purchase/find_sale_item.js');
const create_purchase = require('../../../postgres/create_purchase.js');
const hash_purchase_metadata = require('../../../purchase/hash_purchase_metadata.js');
const decrypt_card_number = require('../../../card/decrypt_card_number.js');
const idempotency_check_purchase = require('../../../purchase/idempotency_check_purchase.js');
const fraud_check = require('../../../purchase/fraud_check.js');
const limits_check = require('../../../purchase/limits_check.js');
const config = require('../../../../config.js');

module.exports = async (body) => {
    const internal_purchase_id = uuidv4();
    log({
        event: 'create purchase',
        body: body,
        internal_purchase_id: internal_purchase_id
    });
    const sale_item = find_sale_item(body.sale_item_key);
    const card_number = await decrypt_card_number(body.integration_encrypted_card_information);
    const metadata = hash_purchase_metadata(body, card_number);

    if (config.dangerous) {
        log({
            event: 'create purchase debug card number log',
            card_number: card_number
        });
    }

    const assessment = await idempotency_check_purchase(body, metadata);
    if (assessment !== null) {
        return assessment;
    }

    await fraud_check(body, metadata);
    await limits_check(internal_purchase_id, body, metadata, sale_item);
    await create_purchase(internal_purchase_id, body, metadata, sale_item);
    const card_id = await create_card(internal_purchase_id, body);
    const payment_assessment = await create_payment(internal_purchase_id, card_id, body, sale_item);
    return payment_assessment;
};