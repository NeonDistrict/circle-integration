const is_valid = require('./is_valid.js');
const schema = {
    type: 'string',
    maxLength: 1024
};

module.exports = is_valid_string = (string) => {
    return is_valid(string, schema);
};