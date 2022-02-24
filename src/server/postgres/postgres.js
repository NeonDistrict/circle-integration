const config = require('../../config.js');
const Pool = require('pg').Pool;
const fatal_error = require('../utilities/fatal_error.js');

console.log('create postgres pool');
const pool = new Pool({
    user: config.postgres_user,
    host: config.postgres_host,
    database: config.postgres_database,
    password: config.postgres_password,
    port: config.postgres_port
});

pool.on('error', (error, client) => {
    return fatal_error({
        error: 'Postgres Error On Idle Client',
        details: error
    });
});

const query = async (text, values) => {
    // todo hook logs
    let result = null;

    try {
        result = await pool.query(text, values);
    } catch (error) {
        console.log('DB ERROR');
        console.log(error);
        // todo log db error
        throw new Error('Internal Server Error');
    }
    
    // todo hook logs
    return result;
};

const postgres = {
    query: query
};
console.log('postgres setup complete');

module.exports = postgres;