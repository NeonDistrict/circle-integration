const openpgp = require('openpgp');
const log = require('../utilities/log.js');
const config = require('../../config.js');
const validate_card_number = require('../validation/validate_card_number.js');

module.exports = async (integration_encrypted_card_information) => {
    let integration_decrypted_card_information = null;
    try {
        const decryption_result = await openpgp.decrypt({
            message: await openpgp.readMessage({
                armoredMessage: integration_encrypted_card_information 
            }),
            verificationKeys: config.pgp_public_key,
            decryptionKeys: await openpgp.decryptKey({
                privateKey: await openpgp.readPrivateKey({ 
                    armoredKey: config.pgp_private_key 
                }),
                passphrase: config.pgp_passphrase
            })
        });
        integration_decrypted_card_information = JSON.parse(decryption_result.data);
    } catch (error) {
        log({
            event: 'decrypt card number integration key failure'
        });
        throw new Error('Integration Key Failure');
    }
    const card_number = integration_decrypted_card_information.card_number;
    validate_card_number(card_number);
    return card_number;
};