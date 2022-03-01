const config = require('../../../../../../config.js');
const validate = require('../../../validation/validate.js');
const schema = {
    type: 'object',
    properties: {
        skip: {
            type: 'integer',
            minimum: 0
        },
        limit: {
            type: 'integer',
            minimum: 1,
            maximum: config.max_pagination_limit
        }
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