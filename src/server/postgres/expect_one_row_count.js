const log = require('../utilities/log.js');

module.exports = (result) => {
    if (result.rowCount !== 1) {
        log({
            event: 'exactly one row was not modified',
            result: result
        });
        throw new Error('Internal Server Error');
    }
    return result;
};