const log = require('../../../../utilities/log.js');
const call_circle = require('../../../../utilities/call_circle.js');

module.exports = async (body) => {
    log({
        event: 'crm payment get',
        body: body
    });
    const circle_response = await call_circle(null, [200], 'get', `/payments/${body.payment_id}`, null);
    return circle_response;
};