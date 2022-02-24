const fatal_error = require('../utilities/fatal_error.js');

module.exports = expect_one_row_count = (result) => {
    if (result.rowCount !== 1) {
        return fatal_error({
            error: 'Query rowCount !== 1'
        });
    }
    return result;
};