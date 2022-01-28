const is_valid = require('./is_valid.js');
const schema = {
    type: 'integer',
    minimum: 0
};

module.exports = is_valid_skip = (skip) => {
    return is_valid(skip, schema);
};