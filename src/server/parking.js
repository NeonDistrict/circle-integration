const parked_notifications = {};
const parked_callbacks = {};
const cleanup_parking_interval = setInterval(parking.cleanup_parking, 3000);
// todo will this ^ cleanup call bitch if parking isnt forward declared

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

    park_notification: (id, result, cb) => {
        // whenever we receive a normal notification (not the confirmation one) we have a race condition, sometimes a callback
        // will already be parked and waiting, and sometimes the callback may not be ready yet, first check if a callback is parked
        if (parked_callbacks.hasOwnProperty(id)) {

            // reaching here implies a callback was parked and already waiting for this result, get that callback and remove it from parking
            const parked_callback = parked_callbacks[id];
            delete parked_callbacks[id];

            // return the result in the callback
            parked_callback.callback(null, result);

            // handled ok
            return cb(null);
        }

        // reaching here implies that a callback was not already waiting meaning that the notification came before we could park one
        // in this case we park the notification so that when the callback goes to park with park_callback it will see it waiting
        parked_notifications[id] = {
            result: result,
            parked_at: new Date().getTime()
        };

        // handled ok
        return cb(null);
    },
    cleanup_parking: () => {
        // todo
    },
    shutdown: () => {
        clearInterval(cleanup_parking_interval);
    }
};