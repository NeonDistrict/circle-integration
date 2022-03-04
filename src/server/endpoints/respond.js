const log = require('../utilities/log.js');

module.exports = (req, res, body) => {
    log({
        event: 'responding okay',
        response: body,
        request: {
            method: req.method,
            url: req.originalUrl,
            ips: req.ips,
            headers: req.headers,
            body: req.body
        },
        ms: new Date().getTime() - req.startTime
    });
    res.status(200);
    res.send(body);
    return res.end();
};