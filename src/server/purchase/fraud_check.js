const log = require('../utilities/log.js');
const fraud_different_names_on_card = require('../postgres/fraud_different_names_on_card.js');
const user_mark_fraud = require('../postgres/user_mark_fraud.js');

module.exports = async (request_purchase, metadata) => {
    log({
        event: 'fraud check',
        request_purchase: request_purchase,
        metadata: metadata
    });

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

