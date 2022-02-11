const validate = require('./validate.js');
const schema = {
    type: 'string',
    maxLength: 1024,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

module.exports = validate_email = (email) => {
    if (!validate(email, schema)) {
        throw new Error('Invalid Email');
    }
};