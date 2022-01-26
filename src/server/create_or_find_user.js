const fatal_error = require('./fatal_error.js');

module.exports = create_or_find_users = (config, postgres, user_id, cb) => {
    return postgres.find_user_by_user_id(user_id, (error, user) => {
        if (error) {
            return cb(error);
        }
        if (user !== null) {
            return postgres.user_mark_t_modified(user_id, (error) => {
                if (error) {
                    return cb(error);
                }
                if (user.fraud) {
                    return cb({
                        error: 'User Is Fraud Locked (Contact Support)'
                    });
                }
                return cb(null, user);
            });
        }
        return postgres.create_user(user_id, (error, user) => {
            if (error) {
                return cb(error);
            }
            if (user !== null) {
                return cb(null, user);
            }
            return fatal_error({
                error: 'No User Returned'
            });
        });
    });
};