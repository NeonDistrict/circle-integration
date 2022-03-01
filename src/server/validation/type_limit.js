const config = require('../../config.js');

module.exports = {
    type: 'integer',
    minimum: 1,
    maximum: config.max_pagination_limit
};