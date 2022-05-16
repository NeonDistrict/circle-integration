## Usage

### General

1. Include this repository as an npm requirement in the client and server projects for the game.

### Game Frontend

1. In the game frontend code include `src/circle_integration_frontend.js`
2. This file provides functions for the client to:
   1. Generate an idempotency key for purchase requests.
   2. Get circle's public keys for encrypting credit card information.
   3. Encrypt credit card information using PGP.
3. The only calls you need to make here are:

```
const idempotency_key = circle_integration_frontend.generate_idempotency_key();
returns:
'string'

const encrypted = await circle_integration_frontend.circle_encrypt_card_information(card_number, card_cvv);
returns:
{
    circle_encrypted_card_information: 'string',
    circle_public_key_id: 'string'
};
```

### Game Server

1. On the game server include `src/circle_integration_client.js`
2. This file provides function for the client to handle the entire purchase flow, and will expect the idempotency key and the encrypted information provided by the frontend.
3. The game server is responsible for authenticating all user requests, and the `user_id` provided to all calls in `circle_integration_client.js` are assumed to have been authenticated by the game server already.
4. See API.md for call information

### CRM Server (Customer Relationship Management)

1. On the game server include `src/circle_integration_crm_client.js`
2. This file provides function for the client to handle the entire administrative purchase management flow, including things like cancelling and refunding purchases, or getting general purchase information
3. The CRM server is responsible for only allowing administrators access.
4. See API.md for call information