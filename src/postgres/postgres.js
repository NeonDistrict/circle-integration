const Pool = require('pg').Pool;

module.exports = create_postgres = (config, cb) => {
    const pool = new Pool({
        user: config.postgres_user,
        host: config.postgres_host,
        database: config.postgres_database,
        password: config.postgres_password,
        port: config.postgres_port
    });
    
    pool.on('error', (error, client) => {
        console.log('Unexpected postgres error on idle client');
        console.log(error);
        process.exit(1);
    });

    const query = (text, values, cb) => {
        // todo hook logs
        pool.query(text, values, (error, result) => {
            // todo hook logs
            return cb(error, result);
        });
    };

    const postgres = {
        pool: pool,
        query: query,
        shutdown: (cb) => {
            postgres.pool.end(cb);
        }
    };

    return cb(null, postgres);
};