const fs = require('fs');

// todo this should be s3 eventually
if (fs.existsSync('./logs')) {
    fs.rmSync('./logs', { recursive: true })
}
fs.mkdirSync('./logs');

let logs = {};
module.exports = purchase_log = (internal_purchase_id, event) => {
    if (!logs.hasOwnProperty(internal_purchase_id)) {
        logs[internal_purchase_id] = [];
    }
    event.t = new Date().getTime();
    logs[internal_purchase_id].push(event);
    fs.writeFileSync('./logs/' + internal_purchase_id + '.json', JSON.stringify(logs[internal_purchase_id], null, 2), 'utf8');
};