const log = require('../utilities/log.js');

module.exports = credit_game = async (internal_purchase_id, user_id, game_id, sale_item_key) => {
    log({
        event: 'credit game', 
        internal_purchase_id: internal_purchase_id, 
        user_id: user_id, 
        game_id: game_id, 
        sale_item_key: sale_item_key
    });

    // todo, actually - you know - credit the game
    // todo this should ensure the game was not already credited
};