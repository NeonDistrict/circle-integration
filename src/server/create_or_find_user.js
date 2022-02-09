const fatal_error = require('./fatal_error.js');
const find_user_by_user_id = require('./postgres/find_user_by_user_id.js');
const user_mark_t_modified = require('./postgres/user_mark_t_modified.js');
const create_user = require('./postgres/create_user.js');

module.exports = create_or_find_users = async (user_id) => {
    let user = await find_user_by_user_id(user_id);
    if (user !== null) {
        await user_mark_t_modified(user_id);
        if (user.fraud) {
            throw new Error('User Is Fraud Locked (Contact Support)');
        }
        return user;
    }
    user = create_user(user_id);
    if (user !== null) {
        return user;
    }
    return fatal_error({
        error: 'No User Returned'
    });
};