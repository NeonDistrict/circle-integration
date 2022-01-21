const validate = require('jsonschema').validate;

module.exports = is_valid = (value, schema) => {
    if (value === undefined) {
        return false;
    }
    if (value === null) {
        return false;
    }
    if (validate(value, schema).errors.length > 0) {
        return false;
    }
    return true;
};