const log = require('../../../utilities/log.js');

module.exports = async (body) => {
    log({
        event: 'authenticating crm (CURRENTLY JUST A STUB)',
        body: body
    });

    return; // todo some kind of auth for crm
};
