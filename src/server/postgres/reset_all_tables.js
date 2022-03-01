const config = require('../../config.js');
const delete_all_tables = require('./delete_all_tables.js');
const create_all_tables = require('./create_all_tables.js');

module.exports = async () => {
    if (!config.dangerous) {
        throw new Error('Dangerous must be enabled to reset_all_tables');
    }
    await delete_all_tables();
    await create_all_tables();
};