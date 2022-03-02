const log = require('../../../../utilities/log.js');
const find_user_by_user_id = require('../../../../postgres/find_user_by_user_id.js');

module.exports = async (body) => {
    log({
        event: 'crm user get',
        body: body
    });
    const user = await find_user_by_user_id(body.user_id);
    if (user === null) {
        log({
            event: 'crm user get user not found',
            body: body
        });
        throw new Error('User Not Found');
    }
    return user;
};