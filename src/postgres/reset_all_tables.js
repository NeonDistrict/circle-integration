const delete_all_tables = require('./delete_all_tables.js');
const create_all_tables = require('./create_all_tables.js');

module.exports = reset_all_tables = (config, query, cb) => {
    if (!config.dangerous) {
        throw new Error('Dangerous must be enabled to reset_all_tables');
    }
    delete_all_tables(config, query, (error, result) => {
        if (error) {
            return cb(error);
        }
        create_all_tables(config, query, (error, result) => {
            if (error) {
                return cb(error);
            }
            return cb(null);
        });
    });
};