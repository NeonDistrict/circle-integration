const fs = require('fs');
const purchase_receipt = fs.readFileSync('./emails/puchase_receipt.html', 'utf8');
const send_email = require('./send_email.js');

module.exports = async (to_email) => {
    const filled_email = purchase_receipt;
    return await send_email(to_email, 'Purchase Receipt', filled_email, 'alt text?');
};

