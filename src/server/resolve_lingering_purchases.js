const resolve_purchase = require('./resolve_purchase.js');
const fatal_error = require('./fatal_error.js');

module.exports = resolve_lingering_purchases = (config, postgres, skip = 0) => {
    return postgres.paginate_lingering_purchases(skip, config.max_pagination_limit, (error, purchases) => {
        if (error) {
            return notify_dev({
                issue: 'Resolve Lingering Purchases Error',
                error: error
            });
        }

        const recurse_through_purchases_in_page = (i, resolved_count, cb) => {
            const purchase = purchases[i];
            return resolve_purchase(config, postgres, purchase, (error, assessment, is_resolved) => {
                if (error) {
                    return cb(error);
                }
                if (is_resolved) {
                    resolved_count++;
                }
                i++;
                if (i === purchases.length) {
                    return cb(null, resolved_count);
                }
                return recurse_through_purchases_in_page(i, resolved_count, cb);
            });
        };

        return recurse_through_purchases_in_page(0, 0, (error, resolved_count) => {
            if (error) {
                return fatal_error(error);
            }
            
            // if we had received a full page there may be more purchases to paginate, get a page
            if (purchases.length === config.max_pagination_limit) {
                // note: as we resolve purchases they will no longer show up in the query, we need to reverse the offset by how many purchases were resolved
                return resolve_lingering_purchases(config, postgres, skip + config.max_pagination_limit - resolved_count);
            }

            // reaching here implies there was not a full page of purchases meaning there are no more to page through
            return;
        });
    });
};