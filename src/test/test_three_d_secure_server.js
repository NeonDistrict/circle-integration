const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

module.exports = create_test_three_d_secure_server = (config, cb) => {
    const app = express();

    app.get(config.three_d_secure_success_endpoint, (req, res) => {
       return res.end();
    });

    app.get(config.three_d_secure_failure_endpoint, (req, res) => {
        return res.end();
    });
    
    // create the https server, binding the express app
    const https_server = https.createServer({
        key: fs.readFileSync(path.join(__dirname, '../../keys/privkey.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../../keys/fullchain.pem')),
    }, app);

    // start the https server
    https_server.listen(config.three_d_secure_server_port, () => {
        
        // server fully initialized, callback
        const test_three_d_secure_server = {
            config: config,
            app: app,
            https_server: https_server,
            shutdown: () => {
                test_three_d_secure_server.https_server.close();
            }
        };
        return cb(null, test_three_d_secure_server);
    });
};