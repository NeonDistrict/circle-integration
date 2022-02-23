const fraud_card_number_used_by_another_user_id = require('./postgres/fraud_card_number_used_by_another_user_id.js');
const fraud_too_many_card_numbers_by_user_id = require('./postgres/fraud_too_many_card_numbers_by_user_id.js');
const fraud_different_names_on_card = require('./postgres/fraud_different_names_on_card.js');

const user_mark_fraud = require('./postgres/user_mark_fraud.js');
const users_mark_fraud = require('./postgres/users_mark_fraud.js');

module.exports = fraud_check = async (request_purchase, metadata) => {
    // if other users are already using this same credit card number, fraud everyone with the card number
    const user_ids = await fraud_card_number_used_by_another_user_id(request_purchase.user_id, metadata.card_number);
    if (user_ids !== null) {
        user_ids.push(request_purchase.user_id);
        await users_mark_fraud(user_ids);
        throw new Error('Fraud Detected');
    }

    // if this user is trying to use a third card on their account, fraud them (note this returns OTHER card numbers, not the one provided)
    const metadata_hash_card_numbers = await fraud_too_many_card_numbers_by_user_id(request_purchase.user_id, metadata.card_number);
    if (metadata_hash_card_numbers !== null && metadata_hash_card_numbers.length >= 2) {
        await user_mark_fraud(request_purchase.user_id);
        throw new Error('Fraud Detected');
    }

    // if this user is trying to use a card that doesnt match the name on previously used cards, fraud them (note this returns OTHER names, not the one provided)
    const metadata_hash_names_on_cards = await fraud_different_names_on_card(request_purchase.user_id, metadata.name_on_card);
    if (metadata_hash_names_on_cards !== null) {
        await user_mark_fraud(request_purchase.user_id);
        throw new Error('Fraud Detected');
    }
};

