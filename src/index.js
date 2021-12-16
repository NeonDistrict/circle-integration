const config_dev = require('./config.dev.js');
const server = require('./server.js');

server.initialize(config_dev, (error) => {
    if (error) {
        throw error;
    }
});