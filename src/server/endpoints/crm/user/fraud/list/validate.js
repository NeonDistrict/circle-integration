const validate = require('../../../../../validation/validate.js');
const type_skip = require('../../../../../validation/type_skip.js');
const type_limit = require('../../../../../validation/type_limit.js');

const schema = {
    type: 'object',
    properties: {
        skip: type_skip,
        limit: type_limit
    },
    required: [
        'skip',
        'limit'
    ],
    additionalProperties: false
};

module.exports = (body) => {
    validate(body, schema);
    return;
};