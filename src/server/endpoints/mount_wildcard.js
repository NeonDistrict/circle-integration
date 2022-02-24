const respond_error = require('./respond_error.js');

module.exports = (app, http_method, url, endpoint_directory) => {
    const validate = require(endpoint_directory + '/validate.js');
    const method = require(endpoint_directory + '/method.js');
    app[http_method](url, async (req, res, next) => {
        try {
            validate(req.body);
            await method(req.body);
            return next();
        } catch (error) {
            return respond_error(res, error);
        } 
    });
};