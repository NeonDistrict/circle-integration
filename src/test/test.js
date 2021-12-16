const assert = require('assert');
const server = require('../server.js');
const config_dev = require('../config.dev.js');


describe('circle-integration-server', () => {
    before((done) => {
        server.initialize(config_dev, (error) => {
            if (error) {
                throw error;
            }
            done();
        });
    });
    
    it('should be okay', () => {
        
    });
});