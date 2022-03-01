const log = require('../utilities/log.js');
const config = require('../../config.js');
const generate_pgp_key_pair = require('../utilities/generate_pgp_key_pair.js');

module.exports = setup_pgp_key_pair = async () => {
    log({
        event: 'generating pgp keypair'
    });
    try {
        const pgp_keypair = await generate_pgp_key_pair();
        config.pgp_passphrase = pgp_keypair.passphrase;
        config.pgp_private_key = pgp_keypair.private_key;
        config.pgp_public_key = pgp_keypair.public_key;
    } catch (error) {
        log({
            event: 'generating pgp keypair error',
            error: error
        }, true);
    }
    log({
        event: 'generated pgp keypair'
    });
};