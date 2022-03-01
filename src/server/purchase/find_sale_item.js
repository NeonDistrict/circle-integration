const log = require('../utilities/log.js');
const config = require('../../config.js');

module.exports = (sale_item_key) => {
    log({
        event: 'find sale item',
        sale_item_key: sale_item_key,
        sale_items: config.sale_items
    });
    const sale_item = config.sale_items.find((search_sale_item) => { 
        return search_sale_item.sale_item_key === sale_item_key; 
    });
    if (sale_item === undefined || sale_item === null) {
        log({
            event: 'could not find sale item',
            sale_item_key: sale_item_key,
            sale_items: config.sale_items
        });
        throw new Error('Sale Item Key Not Found');
    }
    return sale_item;
};