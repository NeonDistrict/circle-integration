const config_dev = require('./config.dev.js');
const create_server = require('./server.js');
const create_postgres = require('./postgres/postgres.js');
const fatal_error = require('./server/fatal_error.js');

create_postgres(config_dev, (error, postgres) => {
    if (error) {
        return fatal_error(error);
    }
    create_server(config_dev, postgres, (error, server) => {
        if (error) {
            return fatal_error(error);
        }
    });
});