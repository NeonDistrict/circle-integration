const validate = require('./validate.js');
const schema = {
    type: 'string',
    minLength: 36,
    maxLength: 36,
    pattern: /[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}/i
};

module.exports = validate_uuid = (uuid) => {
    if (!validate(uuid, schema)) {
        throw new Error('Invalid UUID');
    }
};