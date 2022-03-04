const log = require('../utilities/log.js');

module.exports = (req, res, error) => {
    log({
        event: 'responding error',
        error: error.message,
        stack: error.stack,
        request: {
            method: req.method,
            url: req.originalUrl,
            ips: req.ips,
            headers: req.headers,
            body: req.bodyParsedOkay ? req.body : 'body was not parsed'
        },
        ms: new Date().getTime() - req.startTime
    });
    res.status(500);
    res.send({
        error: error.message
    });
    return res.end();
};