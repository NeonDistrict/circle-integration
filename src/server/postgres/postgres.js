const log = require('../utilities/log.js');
const config = require('../../config.js');
const Pool = require('pg').Pool;

log({
    event: 'setting up postgres'
});
const pool = new Pool({
    user: config.postgres_user,
    host: config.postgres_host,
    database: config.postgres_database,
    password: config.postgres_password,
    port: config.postgres_port
});

pool.on('error', (error, client) => {
    log({
        event: 'postgres pool error', 
        error: error
    }, true);
    throw new Error('Internal Server Error');
});

const query = async (text, values) => {
    let result = null;
    try {
        result = await pool.query(text, values);
        log({
            event: 'postgres query', 
            text: text, 
            values: values, 
            result: result
        });
    } catch (error) {
        log({
            event: 'postgres query', 
            text: text, 
            values: values, 
            error: error
        }, true);
        throw new Error('Internal Server Error');
    }
    return result;
};

const postgres = {
    query: query
};
log({
    event: 'postgres setup complete'
});

module.exports = postgres;