const config = require('../../config.js');
const notify_dev = require('./notify_dev.js');
const parked_notifications = {};
const parked_callbacks = {};
let shutdown_flag = false;

module.exports = parking = {
    park_callback: (id, cb) => {
        // whenever we go to park a callback we actually have a race condition where the notification may have already arrived
        // so first we have to check the parked notifications to see if we have a notification already waiting for this callback
        if (parked_notifications.hasOwnProperty(id)) {
            
            // reaching here implies that a notification was already waiting for us, get that notification and remove it from parking
            const parked_notification = parked_notifications[id];
            delete parked_notifications[id];

            // return the notification in the callback
            return cb(null, parked_notification.result);
        }

        // reaching here implies that no notification was waiting for us already so we go ahead and park this callback
        // once its parked we are done here, the on_notification will pick up the parked callback and call it when ready
        // or in the event of a timeout it will be called back with an error indicating the timeout
        parked_callbacks[id] = {
            callback: cb,
            parked_at: new Date().getTime()
        };
    },

    park_notification: (id, result) => {
        // whenever we receive a normal notification (not the confirmation one) we have a race condition, sometimes a callback
        // will already be parked and waiting, and sometimes the callback may not be ready yet, first check if a callback is parked
        if (parked_callbacks.hasOwnProperty(id)) {

            // reaching here implies a callback was parked and already waiting for this result, get that callback and remove it from parking
            const parked_callback = parked_callbacks[id];
            delete parked_callbacks[id];

            // return the result in the callback
            parked_callback.callback(null, result);

            // handled ok
            return;
        }

        // reaching here implies that a callback was not already waiting meaning that the notification came before we could park one
        // in this case we park the notification so that when the callback goes to park with park_callback it will see it waiting
        parked_notifications[id] = {
            result: result,
            parked_at: new Date().getTime()
        };

        // handled ok
        return;
    },
    parking_monitor: async () => {
        while (1) {
            if (shutdown_flag) {
                return;
            }
            const now = new Date().getTime();

            // a race condition may technically exist where a callback and notification are parked at the
            // same time, we must regularly check to see if two matching ids are parked waiting for each other
            // we gather race ids to not disrupt the for-in enumeration
            const race_ids = [];
            for (const parked_notification_id in parked_notifications) {
                if (parked_callbacks.hasOwnProperty(parked_notification_id)) {
                    
                    // reaching here implies that a race condition was detected, add it to the race ids
                    race_ids.push(parked_notification_id);
                }
            }
            for (const race_id of race_ids) {
                
                // unpark the notification
                const parked_notification = parked_notifications[race_id];
                delete parked_notifications[race_id];

                // unpark the callback
                const parked_callback = parked_callbacks[race_id];
                delete parked_callbacks[race_id];

                // return the result in the callback
                parked_callback.callback(null, parked_notification.result);

                notify_dev({
                    issue: 'Parking Race Condition',
                    notification: parked_notification
                });
            }

            // an issue may occur where a callback or a notification never arrives in parking for
            // a myriad reasons like dropped connection, or an aws outage, etc. we must detect
            // anything left parked, clean it up, and notify a dev.
            // we gather ids as to not disrupt the for-in enumeration
            
            // abandoned notifications...
            const abandoned_notification_ids = [];
            for (const parked_notification_id in parked_notifications) {
                const parked_notification = parked_notifications[parked_notification_id];
                if (now - parked_notification.parked_at > config.parking_abandoned_time) {
                    abandoned_notification_ids.push(parked_notification_id);
                }
            }
            for (const abandoned_notification_id of abandoned_notification_ids) {
                
                // unpark the notification
                const parked_notification = parked_notifications[abandoned_notification_id];
                delete parked_notifications[abandoned_notification_id];

                notify_dev({
                    issue: 'Abandoned Notification',
                    notification: parked_notification
                });
            }

            // abandoned callbacks...
            const abandoned_callback_ids = [];
            for (const parked_callback_id in parked_callbacks) {
                const parked_callback = parked_callbacks[parked_callback_id];
                if (now - parked_callback.parked_at > config.parking_abandoned_time) {
                    abandoned_callback_ids.push(parked_callback_id);
                }
            }
            for (const abandoned_callback_id of abandoned_callback_ids) {
                
                // unpark the callback
                const parked_callback = parked_callbacks[abandoned_callback_id];
                delete parked_callbacks[abandoned_callback_id];

                notify_dev({
                    issue: 'Abandoned Callback',
                    callback_id: abandoned_callback_id
                });
            }
            await new Promise((resolve, reject) => { setTimeout(resolve, config.parking_monitor_loop_time); });
        }
    },
    shutdown: () => {
        shutdown_flag = true;
    }
};