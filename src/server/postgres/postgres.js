const log = require('../utilities/log.js');
const config = require('../../config.js');
const keys = require('../../../keys/keys.js');
const Pool = require('pg').Pool;

log({
    event: 'setting up postgres'
});
const pool = new Pool({
    user: keys.postgres.user,
    host: keys.postgres.host,
    database: keys.postgres.database,
    password: keys.postgres.password,
    port: keys.postgres.port
});

pool.on('error', (error, client) => {
    log({
        event: 'postgres pool error', 
        error: error
    }, true);
    throw new Error('Internal Server Error');
});

const clean_whitespace_from_query_for_log = (text) => {
    // todo: optimize crimes
    text = text.split('\n').join('');
    while (text.includes('  ')) {
        text = text.split('  ').join(' ');
    }
    return text;
};

const clean_result_from_query_for_log = (result) => {
    return {
        rows: result.rows,
        row_count: result.rowCount
    };
};

const query = async (text, values) => {
    let result = null;
    const startTime = new Date().getTime();
    try {
        result = await pool.query(text, values);
        log({
            event: 'postgres query', 
            text: clean_whitespace_from_query_for_log(text), 
            values: values, 
            result: clean_result_from_query_for_log(result),
            ms: new Date().getTime() - startTime
        });
    } catch (error) {
        log({
            event: 'postgres query error', 
            text: clean_whitespace_from_query_for_log(text), 
            values: values, 
            error: error.message,
            stack: error.stack,
            ms: new Date().getTime() - startTime
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