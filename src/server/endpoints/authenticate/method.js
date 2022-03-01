const log = require('../../utilities/log.js');
const create_or_find_user = require('../../user/create_or_find_user.js');

module.exports = async (body) => {
    log({
        event: 'authenticating user',
        user_id: body.user_id,
        body: body
    });
    const user = await create_or_find_user(body.user_id);
    if (user.fraud) {
        log({
            event: 'authenticating user was prevented due to fraud flag',
            user_id: body.user_id,
            body: body,
            user: user
        });
        throw new Error('User Locked: Fraud');
    }
};