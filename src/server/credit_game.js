const purchase_log = require('./purchase_log.js');

module.exports = credit_game = (config, postgres, internal_purchase_id, user_id, game_id, sale_item_key, cb) => {
    purchase_log(internal_purchase_id, {
        event: 'credit_game'
    });

    // todo
    return cb(null);
};