const validate = require('../../../../validation/validate.js');
const type_uuid = require('../../../../validation/type_uuid.js');

const schema = {
    type: 'object',
    properties: {
        internal_purchase_id: type_uuid
    },
    required: [
        'internal_purchase_id'
    ],
    additionalProperties: false
};

module.exports = (body) => {
    validate(body, schema);
    return;
};