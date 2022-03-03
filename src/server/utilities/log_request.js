const log = require('./log.js');

module.exports = (req, res, next) => {
    log({
        event: 'request',
        method: req.method,
        url: req.originalUrl,
        ips: req.ips,
        headers: headers,
        body: req.body
    });
    return next();
};