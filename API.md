## CLIENT

### purchase()

Creates a new purchase. Upon success returns an `internal_purchase_id`. If a 3D-Secure redirect is required it will also return a `redirect` field with a url that the player should be sent too. Note that `/purchase_finalize` must be called after being redirected back.

```
client_generated_idempotency_key:
- Used to prevent duplicate requests, use circle_integration_client.generate_idempotency_key() to create one.

user_id:
- A UUIDv4 representing the user, note that the game server is responsible for authenticating the user the circle integration server assumes this user_id is authenticated already.

metadata_hash_session_id
- A SHA1 Hex string of the users session id, a function is provided in /src/server/utilities/sha1.js to generate this value. The hex string should be exactly 40 characters if done correctly. Circle uses this session id hash as part of fraud prevention.

ip_address
- The IP Address of the user making the purchase, used both internally and by Circle as part of fraud prevention. Note that if you are getting this IP from express you may actually be getting a load balancer/forwarder IP like an idiot (go ahead ask me how I know).

card_number
- The plain text card number as a string with no spaces or dividing characters such as hyphens, the circle_integration_client will handle encrypting it using PGP for you and not transmit it in plain text.

card_cvv
- The 3-5 digit card verification number found on the back of cards as a string with no spaces or dividing characters such as hyphens, the circle_integration_client will handle encrypting it using PGP for you and not transmit it in plain text.

name_on_card
- The full name as it appears on the front of the card. 

city
- The billing address city. 

country
- The billing address country.

address_line_1
- The first address line of the billing address.

address_line_2
- The second address line of the billing address, if empty pass an empty string and not null or undefined.

district
- The province, state, or district of the billing address, in some rare cases a district may not exist in which case pass an empty string and not null or undefined.

postal_zip_code
- The postal or zip code of the billing address, in some rare cases a postal or zip code may not exist in which case pass an empty string and not null or undefined.

expiry_month
- The expiry month from the front of the card as a number (1-12) not as a string.

expiry_year
- The expiry year from the front of the card as a four digit number (2022) not as a string.

email
- The email address associated with billing on the card, note that the user's account email address should not be automatically used, instead the user should manually enter their email address. Circle and payment processors will use this email address for fraud prevention.

phone_number
- The phone number associated with billing on the card as a string, Circle says to use https://github.com/google/libphonenumber for formatting and validation. For the love of god don't try to validate these yourself, phone numbers are basically demonic incantations where no two are in the same format because international standards be damned everyone just do whatever the fuck you want as long as it only uses numeric digits, because fuck programmers thats why, we should be lucky these assholes dont somehow have timezones.

sale_item_key
- The sale item key representing the item being purchased by the user.

success_url
- Some cards will require a 3D-Secure verification which involves a redirect, then upon success will redirect back to this url. This should be a page on the frontend that the user is taken too. Note that circle doesn't support localhost for testing but 127.0.0.1 should work.

failure_url
- Some cards will require a 3D-Secure verification which involves a redirect, then upon failure will redirect back to this url. This should be a page on the frontend that the user is taken too. Note that circle doesn't support localhost for testing but 127.0.0.1 should work.

is_retry
- This is used internally only (not by you) to handle encryption key expiries and refreshes without you needing to regenerate a request properly and worry about idempotency collisions. Just pretend its not here.
```

### purchase_finalize()

In the event that a card required a 3D-Secure verification which involves a redirect, the server needs to be informed that the user was redirected back and to finalize the purchase and credit the game. This call ONLY needs to be called after a 3D-Secure redirect, a purchase that doesn't use 3D-Secure does not require a finalize call, though if you try the server will not complain and just assume you're dumb. Upon success will return an `internal_purchase_id`.

```
user_id
- A UUIDv4 representing the user, note that the game server is responsible for authenticating the user the circle integration server assumes this user_id is authenticated already.

internal_purchase_id
- The UUIDv4 returned by the original purchase request.
```

### purchase_history()

Provides a paginated list of user purchases.

```
user_id
- A UUIDv4 representing the user, note that the game server is responsible for authenticating the user the circle integration server assumes this user_id is authenticated already.

limit
- The page size.

skip
- The number of purchases to skip over.
```

## CRM CLIENT 

### user_get()

Gets a user record.

```
user_id
- A UUIDv4 representing the user.
```

### user_fraud_list()

Get a paginated list of users who are currently marked with the fraud flag.

```
limit
- Number of users per page.

skip
- Number of users to skip.
```

### purchase_fraud_list()

Get a paginated list of purchases that are marked with the fraud flag.

```
limit
- Number of purchases per page.

skip
- Number of purchases to skip.
```

### purchase_get()

Gets a specific purchase.

```
internal_purchase_id
- A UUIDv4 representing the purchase.
```

### purchase_user_list()

Gets a paginated list of all purchases made by a specific user.

```
user_id
- A UUIDv4 representing the user.

limit
- Number of purchases per page.

skip
- Number of purchases to skip.
```

### payment_get()

Gets the most recent information for a payment directly from Circle. Note that a purchase may have multiple payment attempts and a `payment_id` is not an `internal_purchase_id` although they are both UUIDv4s.

```
payment_id
- A UUIDv4 representing a payment.
```

### payment_refund()

Attempts to refund an entire payment to a user.

```
internal_purchase_id
- A UUIDv4 representing the purchase.

payment_id
- A UUIDv4 representing a payment.

reason
- An enumerated value that Circle provides to payment processors, one of the following:
    'duplicate',
    'fraudulent',
    'requested_by_customer',
    'bank_transaction_error',
    'invalid_account_number',
    'insufficient_funds',
    'payment_stopped_by_issuer',
    'payment_returned',
    'bank_account_ineligible',
    'invalid_ach_rtn',
    'unauthorized_transaction',
    'payment_failed'
```

### payment_cancel()

Attempts to cancel a payment by a user.

```
internal_purchase_id
- A UUIDv4 representing the purchase.

payment_id
- A UUIDv4 representing a payment.

reason
- An enumerated value that Circle provides to payment processors, one of the following:
    'duplicate',
    'fraudulent',
    'requested_by_customer',
    'bank_transaction_error',
    'invalid_account_number',
    'insufficient_funds',
    'payment_stopped_by_issuer',
    'payment_returned',
    'bank_account_ineligible',
    'invalid_ach_rtn',
    'unauthorized_transaction',
    'payment_failed'
```