const is_valid = require('./is_valid.js');
const schema = {
    type: 'string',
    maxLength: 1024,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

module.exports = is_valid_email = (email) => {
    return is_valid(email, schema);
};