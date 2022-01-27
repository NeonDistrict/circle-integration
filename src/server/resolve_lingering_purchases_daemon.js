const resolve_lingering_purchases = require('./resolve_lingering_purchases.js');
const notify_dev = require('./notify_dev.js');

module.exports = resolve_lingering_purchases_daemon = (config, postgres) => {
    resolve_lingering_purchases(config, postgres, (error) => {
        if (error) {
            notify_dev({
                issue: 'Resolve Lingering Purchases Error',
                error: error
            });
        }
        return setTimeout(resolve_lingering_purchases_daemon, config.resolve_lingering_purchases_daemon_loop_time, config, postgres);
    });
};