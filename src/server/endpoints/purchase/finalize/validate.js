const validate = require('../../../validation/validate.js');
const type_uuid = require('../../../validation/type_uuid');

const schema = {
    type: 'object',
    properties: {
        user_id: type_uuid,
        internal_purchase_id: type_uuid
    },
    required: [
        'user_id',
        'internal_purchase_id'
    ],
    additionalProperties: false
};

module.exports = (body) => {
    validate(body, schema);
    return;
};