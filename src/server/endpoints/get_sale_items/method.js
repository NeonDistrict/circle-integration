const log = require('../../utilities/log.js');
const config = require('../../../config.js');

module.exports = async (body) => {
    // return some demo items
    log({
        event: 'get sale items',
        body: body,
        sale_items: config.sale_items
    });
    return config.sale_items;
};