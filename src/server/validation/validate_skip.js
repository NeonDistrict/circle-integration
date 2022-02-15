const validate = require('./validate.js');
const schema = {
    type: 'integer',
    minimum: 0
};

module.exports = validate_skip = (skip) => {
    validate(skip, schema);
};