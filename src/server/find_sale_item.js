const config = require('../config.js');

module.exports = find_sale_item = (sale_item_key) => {
    const sale_item = config.sale_items.find((search_sale_item) => { 
        return search_sale_item.sale_item_key === sale_item_key; 
    });
    if (sale_item === undefined || sale_item === null) {
        throw new Error('Sale Item Key Not Found');
    }
    return sale_item;
};