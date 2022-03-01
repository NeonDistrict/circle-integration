const log = require('../utilities/log.js');

module.exports = (res, body) => {
    log({
        event: 'responding okay',
        body: body
    });
    res.status(200);
    res.send(body);
    return res.end();
};