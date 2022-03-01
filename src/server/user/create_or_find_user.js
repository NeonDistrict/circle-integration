const log = require('../utilities/log.js');
const find_user_by_user_id = require('../postgres/find_user_by_user_id.js');
const user_mark_t_modified = require('../postgres/user_mark_t_modified.js');
const create_user = require('../postgres/create_user.js');

module.exports = async (user_id) => {
    log({
        event: 'create or find user',
        user_id: user_id
    });
    let user = await find_user_by_user_id(user_id);
    if (user !== null) {
        await user_mark_t_modified(user_id);
        if (user.fraud) {
            log({
                event: 'create or find user, user was fraud locked',
                user_id: user_id,
                user: user
            });
            throw new Error('User Is Fraud Locked (Contact Support)');
        }
        return user;
    }
    user = create_user(user_id);
    if (user !== null) {
        return user;
    }
    log({
        event: 'create or find user no user was returned by create user',
        user_id: user_id
    }, true);
    throw new Error('Internal Server Error');
};