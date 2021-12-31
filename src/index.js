const config_dev = require('./config.dev.js');
const create_server = require('./server.js');

create_server(config_dev, (error, server) => {
    if (error) {
        throw error;
    }
});