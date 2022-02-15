const config = require('../config.js');
const fatal_error = require('./fatal_error.js');
const generate_pgp_key_pair = require('./utilities/generate_pgp_key_pair.js');

module.exports = setup_pgp_key_pair = async () => {
    console.log('generating pgp keypair');
    try {
        const pgp_keypair = await generate_pgp_key_pair();
        config.pgp_passphrase = pgp_keypair.passphrase;
        config.pgp_private_key = pgp_keypair.private_key;
        config.pgp_public_key = pgp_keypair.public_key;
    } catch (error) {
        return fatal_error({
            error: 'Generate PGP Keypair Threw Error',
            details: error
        });
    }
};