const log = require('../utilities/log.js');

module.exports = (res, error) => {
    log({
        event: 'responding error',
        error: error.message,
        stack: error.stack
    });
    res.status(500);
    res.send({
        error: error.message
    });
    return res.end();
};