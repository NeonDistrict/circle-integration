const is_valid = require('./is_valid.js');
const schema = {
    type: 'integer',
    minimum: 1
};

module.exports = is_valid_limit = (limit) => {
    return is_valid(limit, schema);
};