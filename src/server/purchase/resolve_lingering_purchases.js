const log = require('../utilities/log.js');
const config = require('../../config.js');
const resolve_purchase = require('./resolve_purchase.js');
const paginate_lingering_purchases = require('../postgres/paginate_lingering_purchases.js');

let shutdown_flag = false;
module.exports = {
    start: async () => {
        log({
            event: 'paginate lingering purchases loop started'
        });
        while (1) {
            if (shutdown_flag) {
                log({
                    event: 'paginate lingering purchases loop shut down successfully'
                });
                return;
            }
            let skip = 0;
            let lingering_purchases = null;
            do {
                lingering_purchases = await paginate_lingering_purchases(skip, config.max_pagination_limit);
                if (lingering_purchases.length > 0) {
                    log({
                        event: 'paginate lingering purchases has results',
                        lingering_purchases: lingering_purchases
                    });
                }
                let resolved_count = 0;
                for (const lingering_purchase of lingering_purchases) {
                    const result = await resolve_purchase(lingering_purchase);
                    if (result.resolved) {
                        resolved_count++;
                    }
                }
                // note every purchase that is resolved will change the pageination skip, offset it backwards by how many purchases are resolved
                skip += lingering_purchases.length;
                skip -= resolved_count;

            // if we didnt get a full page we hit the end of lingering purchases
            } while (lingering_purchases.length === config.max_pagination_limit);
            
            await new Promise((resolve, reject) => { setTimeout(resolve, config.resolve_lingering_purchases_loop_time); });
        }
    },
    shutdown: () => {
        log({
            event: 'paginate lingering purchases loop flagged for shutdown'
        });
        shutdown_flag = true;
    }
};