const assert = require('assert');
const server = require('../server.js');
const config_dev = require('../config.dev.js');


describe('circle-integration-server', function () {
    before(function (done) {
        server.initialize(config_dev, function (error) {
            if (error) {
                throw error;
            }
            done();
        });
    });

    after(function () {
        server.shutdown();
    });
    
    it('should be okay', function () {
        
    });
});