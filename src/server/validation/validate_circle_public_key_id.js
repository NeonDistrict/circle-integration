const validate_string = require('./validate_string.js');

module.exports = validate_circle_public_key_id = (circle_public_key_id) => {
    if (!validate_string(circle_public_key_id))
    {
        throw new Error('Invalid circle_public_key_id');
    }
};