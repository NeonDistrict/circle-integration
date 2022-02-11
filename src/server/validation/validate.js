const jsonschema_validate = require('jsonschema').validate;

module.exports = validate = (value, schema) => {
    if (value === undefined) {
        return false;
    }
    if (value === null) {
        return false;
    }
    if (jsonschema_validate(value, schema).errors.length > 0) {
        return false;
    }
    return true;
};