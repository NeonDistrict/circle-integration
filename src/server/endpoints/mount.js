const respond = require('./respond.js');
const respond_error = require('./respond_error.js');

module.exports = (app, http_method, url, endpoint_directory) => {
    const validate = require(endpoint_directory + '/validate.js');
    const method = require(endpoint_directory + '/method.js');
    app[http_method](url, async (req, res) => {
        try {
            validate(req.body);
            const response = await method(req.body);
            return respond(res, response);
        } catch (error) {
            return respond_error(res, error);
        } 
    });
};