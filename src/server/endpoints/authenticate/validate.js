const validate = require('../../validation/validate.js');
const type_uuid = require('../../validation/type_uuid.js');

const schema = {
    type: 'object',
    properties: {
        user_id: type_uuid
    },
    required: [
        'user_id'
    ],
    additionalProperties: true
};

module.exports = (body) => {
    validate(body, schema);
    return;
};