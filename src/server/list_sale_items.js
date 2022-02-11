const config = require('../config.js');

module.exports = list_sale_items = async () => {
    // return some demo items
    return config.sale_items;
}