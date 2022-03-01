const log = require('../utilities/log.js');

module.exports = (result) => {
    if (result.rows.length === 0) {
        return null;
    }
    if (result.rows.length === 1) {
        return result.rows[0];
    }
    log({
        event: 'exactly zero or one row was not returned',
        result: result
    });
    throw new Error('Internal Server Error');
};