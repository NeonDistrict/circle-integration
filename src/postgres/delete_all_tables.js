const drop_tables = (config, query, cb) => {
    const text = 
    `
    DROP TABLE IF EXISTS 
        "purchases",
        "users"
    CASCADE;
    `;
    const values = [];
    return query(text, values, cb);
};

const drop_enums = (config, query, cb) => {
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
    return query(text, values, cb);
};

module.exports = delete_all_tables = (config, query, cb) => {
    if (!config.dangerous) {
        throw new Error('Dangerous must be enabled to delete_all_tables');
    }
    const operations = [
        drop_tables,
        drop_enums
    ];

    const recurse_operations = (operation_index, cb) => {
        operations[operation_index](config, query, (error, result) => {
            if (error) {
                return cb(error);
            }
            if (operation_index + 1 < operations.length) {
                return recurse_operations(operation_index + 1, cb);
            } else {
                return cb(null);
            }
        });
    };

    return recurse_operations(0, cb);
};