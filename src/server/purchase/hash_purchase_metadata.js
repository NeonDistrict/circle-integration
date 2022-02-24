const sha512 = require('../utilities/sha512.js');

module.exports = hash_purchase_metadata = (request_purchase, card_number) => {
    const metadata = {
        email:                sha512(request_purchase.email),
        phone_number:         sha512(request_purchase.phone_number),
        ip_address:           sha512(request_purchase.ip_address),
        name_on_card:         sha512(request_purchase.name_on_card),
        city:                 sha512(request_purchase.city),
        country:              sha512(request_purchase.country),
        district:             sha512(request_purchase.district),
        address_line_1:       sha512(request_purchase.address_line_1),
        address_line_2:       sha512(request_purchase.address_line_2),
        postal_zip_code:      sha512(request_purchase.postal_zip_code),
        expiry_month:         sha512(request_purchase.expiry_month),
        expiry_year:          sha512(request_purchase.expiry_year),
        card_number:          sha512(card_number),
        circle_public_key_id: sha512(request_purchase.circle_public_key_id)
    };
    return metadata;
};