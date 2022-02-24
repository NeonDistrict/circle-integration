const config = require('../../../../config.js');
const validate = require('../../../validation/validate.js');
const schema = {
    type: 'object',
    properties: {
        user_id: {
            type: 'string',
            minLength: 36,
            maxLength: 36,
            pattern: /[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}/i
        },
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
        'user_id',
        'skip',
        'limit'
    ],
    additionalProperties: false
};

module.exports = (body) => {
    validate(body, schema);
    return;
};