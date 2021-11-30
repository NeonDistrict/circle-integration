# Circle Integration
Contains documentation, demo, and back/front end components required to integrate circle payments into a project.

## Useful Links

+ [Circle Homepage](https://www.circle.com/en/)
+ [Circle Payments API Documentation](https://developers.circle.com/docs/accept-card-payments-online)


## Understanding Idempotency

Lets pretend you want to make a purchase, so you click on buy - but then nothing happens so you click buy again and it goes through just fine. A few weeks later you receive your bill and you have been charged twice! As far as you give two shits idempotency and idempotent requests are a way to prevent this.

Whenever you, the user of this library, creates a page for a purchase you ask the circle_integration library for an `idempotency_key` which will generate you a key. Whenever the player clicks the buy button, this `idempotency_key` is included in your request. This means that if they spam click the buy button 100 times on that page, the same `idempotency_key` is included in every request, and this key is used as a check against duplicate requests preventing the dreaded charged-twice scenario above.

Now lots of calls to circle require these `idempotency_key`s and it is your job to get a new key for each unique request. Unique here being unique player intent, for example "i want to buy this cool sword", "i want to add this credit card to my account", and "i want to see my purchase history" are all unique player intents.

I swear if I catch one of you just inlining `generate_idempotency_key()` right on your buy button and not using it correctly I will beat you with the loose brass end of a length of garden hose. Player chargebacks, which are a direct result of double-processing, affect our ability to accept credit card payments and result in hefty-ass "we're probably going to have to fire one of you chuckle-fucks to cover the cost of it", fines from visa and mastercard.

As a rule of thumb, if you load a new page with a request on it, that request gets it's own `idempotency_key`. If the page is refreshed, get a new key, if the page goes back then forward, get a new key, if the player is legit trying to make a second purchase of the exact same thing, get a new key. 

If the player tries to send the exact same request more than once, it better have the same god damn key so help me.

You now know everything you need to know about idempotent requests, but if you are even vaguely unsure ask Adrian and he will clarify.

## Understanding Sale Item Keys

A `sale_item_key` and it's associated `sale_item_information` are a way to describe items that Neon District has for sale. When a player goes to the store the client will request a list of sale items from the server, literally a list of items that can be purchased. Each of these items has a key: `sale_item_key` that is then used by the client to signify to the server what purchase the player wants to make. This key will also show up on the credit card statement as an indicator to the player what they purchased to help reduce unexplained charges and therefore chargebacks. This key further shows up in our internal tracking and analytics to answer questions like "how many players purchased 1000 neon packs, vs 500 neon packs?". An example sale item is shown below

```
{
    "sale_item_key": "NEON_1000",
    "currency": "USD",
    "amount": "1.00",
    "statement_description": "NEON DISTRICT: 1000 NEON",
    "store_description": "Adds 1000 NEON to your account.",
    "store_image": "https://images/NEON_1000.png"
}
```

## Frontend Integration

### Install OpenPgP

[OpenPgP](https://github.com/openpgpjs/openpgpjs)

The frontend must require OpenPgP which circle uses for encryption on the client. This library can be installed for use in the frontend via:

`npm install --save-dev openpgp`

Once installed OpenPgP can be imported using:

`import * as openpgp from 'openpgp';`

### Usage

1. At page load time client gets public key from server using `await circle_integration.get_public_key()`, the client api will handle the key for you, you just need to handle any errors from the call.

1. Before a player can make a purchase they need to create a card which can be done using `await circle_integration.create_card(idempotency_key, card_number, card_cvv, name_on_card, city, country, address_line_1, address_line_2, district, postal_zip_code, expiry_month, expiry_year)`.