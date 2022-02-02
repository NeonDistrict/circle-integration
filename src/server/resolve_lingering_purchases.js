module.exports = resolve_lingering_purchases = (config, postgres, skip = 0) => {
    postgres.paginate_lingering_purchases(skip, config.max_pagination_limit, (error, purchases) => {
        if (error) {
            return notify_dev({
                issue: 'Resolve Lingering Purchases Error',
                error: error
            });
        }

        // todo iterate purchases, and query circle to see if they can be updated and finished

        if (purchases.length === config.max_pagination_limit) {
            return resolve_lingering_purchases(config, postgres, skip + config.max_pagination_limit);
        }

        return; // done!
    });
};