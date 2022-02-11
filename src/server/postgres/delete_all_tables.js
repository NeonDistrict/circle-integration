const config = require('../../config.js');
const postgres = require('./postgres.js');

const drop_tables = async () => {
    const text = 
    `
    DROP TABLE IF EXISTS 
        "purchases",
        "users"
    CASCADE;
    `;
    const values = [];
    return await postgres.query(text, values);
};

const drop_enums = async () => {
    const text = 
    `
    DROP TYPE IF EXISTS 
        "GAME_IDENTIFIER",
        "PURCHASE_STATUS", 
        "GAME_CREDITED_STATUS", 
        "CREATE_CARD_STATUS",
        "PUBLIC_KEY_STATUS",
        "PAYMENT_3DS_STATUS",
        "PAYMENT_CVV_STATUS",
        "PAYMENT_UNSECURE_STATUS";
    `;
    const values = [];
    return await postgres.query(text, values);
};

module.exports = delete_all_tables = async () => {
    if (!config.dangerous) {
        throw new Error('Dangerous must be enabled to delete_all_tables');
    }
    await drop_tables();
    await drop_enums();
};