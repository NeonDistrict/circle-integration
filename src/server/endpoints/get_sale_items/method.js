const config = require('../../../config.js');

module.exports = async (body) => {
    // return some demo items
    return config.sale_items;
};