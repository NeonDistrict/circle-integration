const jsonschema_validate = require('jsonschema').validate;

module.exports = validate = (value, schema) => {
    if (value === undefined) {
        throw new Error('Validation value undefined');
    }

    if (value === null) {
        throw new Error('Validation Value null');
    }

    const validation_errors = jsonschema_validate(value, schema).errors;

    if (validation_errors[0].schema.error) {
        throw new Error('Validation Error: ' + validation_errors[0].schema.error);
    }

    if (validation_errors.length > 0) {
        throw new Error('Validation Error: ' + validation_errors[0]);
    }
    
    return;
};