module.exports = resolve_lingering_purchases = (config, postgres, cb, skip = 0) => {
    postgres.paginate_lingering_purchases(skip, config.max_pagination_limit, (error, purchases) => {
        if (error) {
            return cb(error);
        }

        // todo iterate purchases, and query circle to see if they can be updated and finished

        if (purchases.length === config.max_pagination_limit) {
            return resolve_lingering_purchases(config, postgres, cb, skip + config.max_pagination_limit);
        }
        return cb(null);
    });
};