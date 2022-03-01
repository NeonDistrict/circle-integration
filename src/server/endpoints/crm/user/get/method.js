const find_user_by_id = require('../../../../../postgres/find_user_by_id.js');

module.exports = async (body) => {
    const user = await find_user_by_id(body.user_id);
    if (user === null) {
        throw new Error('User Not Found');
    }
    return user;
};