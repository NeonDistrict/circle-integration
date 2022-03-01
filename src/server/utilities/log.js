const config = require('../../config.js');
const os = require('os');
const winston = require('winston');
require('winston-syslog');

const papertrail = new winston.transports.Syslog({
    app_name: config.app_name,
    host: 'logs.papertrailapp.com',
    port: 31922,
    protocol: 'tls4',
    localhost: os.hostname(),
    eol: '\n',
    handleExceptions: true
});

const logger = winston.createLogger({
  format: winston.format.simple(),
  levels: winston.config.syslog.levels,
  transports: [papertrail],
});

module.exports = (obj, is_error = false) => {
    obj.t = new Date().getTime();
    const message = JSON.stringify(obj);
    if (is_error) {
        logger.error(message);
    } else {
        logger.info(message);
    }
};