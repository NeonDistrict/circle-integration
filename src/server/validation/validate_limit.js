const validate = require('./validate.js');
const schema = {
    type: 'integer',
    minimum: 1
};

module.exports = validate_limit = (limit) => {
    if (!validate(limit, schema)) {
        throw new Error('Invalid Limit');
    }
};