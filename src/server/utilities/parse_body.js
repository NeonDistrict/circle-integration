const config = require('../../config.js');
const respond_error = require('../endpoints/respond_error.js');

module.exports = (req, res, next) => {
    let body_length = 0;
    let data_ended = false;
    const body_parts = [];
    req.on('data', (chunk) => {
        if (data_ended) {
            return;
        } 
        if (body_length + chunk.length > config.max_body_length) {
            data_ended = true;
            return respond_error(req, res, new Error('Body Too Large'));
        }
        body_length += chunk.length;
        body_parts.push(chunk);
    });
    req.on('end', function(){
        if (data_ended) {
            return;
        } 
        data_ended = true;
        const raw_body = body_parts.join('');
        let parsed_body = null;
        try {
            parsed_body = JSON.parse(raw_body);
        } catch (error) {
            return respond_error(req, res, new Error('Malformed Body'));
        }
        req.body = parsed_body;
        req.bodyParsedOkay = true;
        return next();
    });
};