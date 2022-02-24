const purchase_log = require('../utilities/purchase_log.js');

module.exports = credit_game = async (internal_purchase_id, user_id, game_id, sale_item_key) => {
    purchase_log(internal_purchase_id, {
        event: 'credit_game'
    });

    // todo
    console.log('credit game');
};