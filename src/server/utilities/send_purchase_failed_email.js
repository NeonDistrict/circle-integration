const fs = require('fs');
const purchase_failed = fs.readFileSync('./emails/puchase_failed.html', 'utf8');
const send_email = require('./send_email.js');

module.exports = async (to_email) => {
    const filled_email = purchase_failed;
    return await send_email(to_email, 'Purchase Failed', filled_email, 'alt text?');
};

