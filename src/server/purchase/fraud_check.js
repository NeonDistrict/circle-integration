const log = require('../utilities/log.js');
const fraud_card_number_used_by_another_user_id = require('../postgres/fraud_card_number_used_by_another_user_id.js');
const fraud_too_many_card_numbers_by_user_id = require('../postgres/fraud_too_many_card_numbers_by_user_id.js');
const fraud_different_names_on_card = require('../postgres/fraud_different_names_on_card.js');
const user_mark_fraud = require('../postgres/user_mark_fraud.js');
const users_mark_fraud = require('../postgres/users_mark_fraud.js');

module.exports = async (request_purchase, metadata) => {
    log({
        event: 'fraud check',
        request_purchase: request_purchase,
        metadata: metadata
    });

    // if other users are already using this same credit card number, fraud everyone with the card number
    let user_ids = await fraud_card_number_used_by_another_user_id(request_purchase.user_id, metadata.card_number);
    if (user_ids.length > 0) {
        user_ids = user_ids.map((row) => { return row.user_id});
        user_ids.push(request_purchase.user_id);
        await users_mark_fraud(user_ids);
        log({
            event: 'fraud check detected multiple users using the same credit card number',
            request_purchase: request_purchase,
            metadata: metadata,
            user_ids: user_ids
        });
        throw new Error('Fraud Detected');
    }

    // if this user is trying to use a third card on their account, fraud them (note this returns OTHER card numbers, not the one provided)
    const metadata_hash_card_numbers = await fraud_too_many_card_numbers_by_user_id(request_purchase.user_id, metadata.card_number);
    if (metadata_hash_card_numbers.length >= 2) {
        await user_mark_fraud(request_purchase.user_id);
        log({
            event: 'fraud check detected a user adding more than 2 cards to their account',
            request_purchase: request_purchase,
            metadata: metadata,
            metadata_hash_card_numbers: metadata_hash_card_numbers
        });
        throw new Error('Fraud Detected');
    }

    // if this user is trying to use a card that doesnt match the name on previously used cards, fraud them (note this returns OTHER names, not the one provided)
    const metadata_hash_names_on_cards = await fraud_different_names_on_card(request_purchase.user_id, metadata.name_on_card);
    if (metadata_hash_names_on_cards > 0) {
        await user_mark_fraud(request_purchase.user_id);
        log({
            event: 'fraud check detected a user adding a card that has a different name on it',
            request_purchase: request_purchase,
            metadata: metadata,
            metadata_hash_names_on_cards: metadata_hash_names_on_cards
        });
        throw new Error('Fraud Detected');
    }
};

