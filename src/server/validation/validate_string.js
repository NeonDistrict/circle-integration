const validate = require('./validate.js');
const schema = {
    type: 'string',
    maxLength: 1024
};

// todo this should be extended to all types for specific errors
module.exports = validate_string = (string) => {
    return validate(string, schema);
};