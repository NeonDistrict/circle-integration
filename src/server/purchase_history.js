module.exports = purchase_history = (config, postgres, user_id, skip, limit, cb) => {
    postgres.paginate_purchases_by_user_id(user_id, skip, limit, (error, purchases) => {
        if (error) {
            return cb(error);
        }
        return cb(null, purchases);
    });
};