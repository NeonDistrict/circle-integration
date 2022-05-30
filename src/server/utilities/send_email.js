const keys = require('../../../keys/keys.js');
const config = require('../../config.js');
const log = require('./log.js');
const ses = require('node-ses');
const ses_client = ses.createClient(keys.email_keys);

module.exports = async (to_email, subject, message, alt_text) => {
    return await new Promise((resolve, reject) => {
        const email = {
            to: to_email, 
            from: config.from_email,
            subject: subject,
            message: message,
            altText: alt_text
        };
        log({
            event: 'email',
            email: email
        });
        ses_client.sendEmail(email, (error, data, response) => {
            if (error) {
                log({
                    event: 'email error',
                    email: email,
                    error: error.message,
                    stack: error.stack
                });
                return reject(error);
            }
            return resolve();
        });
    });
};

