const express = require('express');
const body_parser = require('body-parser')
const app = express();
const port = 3000;
const circle_integration = require('../circle_integration_server.js');

app.use(express.static('static'));
app.use(body_parser.json());

app.post('/get_public_key', async (req, res) => {
    const public_key = circle_integration.get_public_key();
    res.send(public_key);
});

app.listen(port, () => {
    console.log(`circle-integration-example listening at http://localhost:${port}`);
});
