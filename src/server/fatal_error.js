const notify_dev = require('./notify_dev.js');

module.exports = fatal_error = (error) => {
    notify_dev({
        issue: 'Fatal Error',
        error: error
    });
    console.log('FATAL ERROR');
    console.log(JSON.stringify(error, null, 2));
    process.exit(1);
};