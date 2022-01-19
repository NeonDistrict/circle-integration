const test_amounts = require('./test/test_amounts.js');

const sale_items_dev = [
    {
        "sale_item_key": "NEON_1000",
        "currency": "USD",
        "sale_item_price": "1.00",
        "statement_description": "NEON DISTRICT: 1000 NEON",
        "store_description": "Adds 1000 NEON to your account.",
        "store_image": "https://images/NEON_1000.png"
    }
];

for (const test_amount_key in test_amounts) {
    test_amount = test_amounts[test_amount_key];
    sale_items_dev.push({
        "sale_item_key": test_amount_key,
        "currency": "USD",
        "sale_item_price": test_amount.amount,
        "statement_description": `NEON DISTRICT: ${test_amount_key}`,
        "store_description": test_amount.description,
        "store_image": `https://images/${test_amount_key}.png`
    });
}

module.exports = sale_items_dev;