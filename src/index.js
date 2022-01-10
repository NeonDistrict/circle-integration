const config_dev = require('./config.dev.js');
const create_server = require('./server.js');
const create_postgres = require('./postgres.js');

create_postgres(config_dev, (error, postgres) => {
    if (error) {
        throw error;
    }
    create_server(config_dev, postgres, (error, server) => {
        if (error) {
            throw error;
        }
    });
});