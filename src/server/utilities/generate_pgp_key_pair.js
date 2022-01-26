const openpgp = require('openpgp');
const { v4: uuidv4 } = require('uuid');

const generate_passphrase = (length) => {
    let parts = [];
    const available = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < length; i++) {
        const random_index = Math.floor(Math.random() * available.length);
        const random_character = available[random_index];
        parts.push(random_character);
    }
    const passphrase = parts.join('');
    return passphrase;
};

module.exports = generate_pgp_key_pair = async (cb) => {
    const passphrase = generate_passphrase(256);
    let generated = null;
    try {
        generated = await openpgp.generateKey({
            type: 'ecc',
            curve: 'curve25519',
            userIDs: [{ name: uuidv4() }],
            passphrase: passphrase,
            format: 'armored'
        });
    } catch (error) {
        return cb(error);
    }
    const private_key = generated.privateKey;
    const public_key = generated.publicKey;
    return cb(null, passphrase, private_key, public_key);
};