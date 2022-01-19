const sale_items = require('./sale_items.dev.js');
// todo these should be passed in like config maybe?
// maybe literally in the config to keep it simple

module.exports = list_sale_items = () => {
    // todo what if we want sale items per user or something? maybe a delegate to get that from integrator

    // return some demo items
    return sale_items;
}