const create_or_find_user = require('../../user/create_or_find_user.js');

module.exports = async (body) => {
    const user = await create_or_find_user(body.user_id);
    if (user.fraud) {
        throw new Error('User Locked: Fraud');
    }
};