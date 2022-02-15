const config = require('../../config.js');
const validate = require('./validate.js');
const schema = {
    type: 'integer',
    minimum: 1,
    maximum: config.max_pagination_limit
};

module.exports = validate_limit = (limit) => {
    if (!validate(limit, schema)) {
        throw new Error('Invalid Limit');
    }
};