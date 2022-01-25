module.exports = expect_one_row_count = (error, result, cb) => {
    if (error) {
        return cb({
            error: 'Server Error'
        });
    }
    if (result.rowCount !== 1) {
        return fatal_error({
            error: 'Query rowCount !== 1'
        });
    }
    return cb(null);
};