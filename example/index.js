const express = require('express');
const body_parser = require('body-parser')
const app = express();
const port = 3000;
const circle_integration = require('../circle_integration_server.js');

app.use(express.static('static'));
app.use(body_parser.json());

// todo there should be some json schema validation here, and error responses, logging etc
// todo generic responders

let routes_activated = false;

app.post('/aws_sns', async (req, res) => {
    ({ error, notification_confirmed } = await circle_integration.on_notification(req.body));
    // todo error?

    if (notification_confirmed === 1 && !routes_activated) {
        routes_activated = true;
        app.post('/get_public_key', async (req, res) => {
            const public_key = await circle_integration.get_public_key();
            res.send(public_key);
        });

        app.post('/check_purchase_limit', async (req, res) => {
            const purchase_limit = await circle_integration.check_purchase_limit(req.user_id);
            res.send(purchase_limit);
        });

        app.post('/get_sale_items', async (req, res) => {
            const sale_items = await circle_integration.get_sale_items(req.user_id);
            res.send(sale_items);
        });

        app.post('/purchase', async (req, res) => {
            // todo this card packet needs a lot of detail
            const receipt = await circle_integration.purchase(req.user_id, req.sale_item_id, req.card);
            res.send(receipt);
        });

        app.post('/purchase_history', async (req, res) => {
            const purchase_history_page = await circle_integration.purchase_history(req.user_id, req.after_id);
            res.send(purchase_history_page);
        });
    }
    
    res.end();
});


app.listen(port, () => {
    console.log(`circle-integration-example listening at http://localhost:${port}`);
});
