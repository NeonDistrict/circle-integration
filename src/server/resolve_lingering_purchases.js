const resolve_purchase = require('./resolve_purchase.js');
const fatal_error = require('./fatal_error.js');
const paginate_lingering_purchases = require('./postgres/paginate_lingering_purchases.js');
const config = require('../config.js');

let shutdown_flag = false;

module.exports = resolve_lingering_purchases = {
    start: async () => {
        while (1) {
            if (shutdown_flag) {
                return;
            }

            let skip = 0;
            do {
                let lingering_purchases = null;
                try {
                    lingering_purchases = await paginate_lingering_purchases(skip, config.max_pagination_limit);
                } catch (error) {
                    return fatal_error(error);
                }
                let resolved_count = 0;
                for (const lingering_purchase of lingering_purchases) {
                    const result = await resolve_purchase(lingering_purchase);
                    if (result.is_resolved) {
                        resolved_count++;
                    }
                }
                // note every purchase that is resolved will change the pageination skip, offset it backwards by how many purchases are resolved
                skip -= resolved_count;
                skip += lingering_purchases.length;

            // if we didnt get a full page we hit the end of lingering purchases
            } while (lingering_purchases.length === config.max_pagination_limit);
            
            await new Promise((resolve, reject) => { setTimeout(resolve, config.resolve_lingering_purchases_loop_time); });
        }
    },
    shutdown: () => {
        shutdown_flag = true;
    }
};