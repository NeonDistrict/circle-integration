const create_game_identitier_enum = (config, query, cb) => {
    const text = 
    `
    CREATE TYPE "GAME_IDENTIFIER" AS ENUM (
        'NEON_DISTRICT'
    );
    `;
    const values = [];
    return query(text, values, cb);
};

const create_purchase_status_enum = (config, query, cb) => {
    const text = 
    `
    CREATE TYPE "PURCHASE_STATUS" AS ENUM (
        'PENDING',
        'FAILED',
        'FRAUD',
        'COMPLETED'
    );
    `;
    const values = [];
    return query(text, values, cb);
};

const create_game_credited_status_enum = (config, query, cb) => {
    const text = 
    `
    CREATE TYPE "GAME_CREDITED_STATUS" AS ENUM (
        'NONE',
        'REQUESTED',
        'FAILED',
        'COMPLETED'
    );
    `;
    const values = [];
    return query(text, values, cb);
};

const create_create_card_status_enum = (config, query, cb) => {
    const text = 
    `
    CREATE TYPE "CREATE_CARD_STATUS" AS ENUM (
        'NONE',
        'REQUESTED',
        'PENDING',
        'FAILED',
        'FRAUD',
        'COMPLETED'
    );
    `;
    const values = [];
    return query(text, values, cb);
};

const create_public_key_status_enum = (config, query, cb) => {
    const text = 
    `
    CREATE TYPE "PUBLIC_KEY_STATUS" AS ENUM (
        'NONE',
        'FAILED',
        'COMPLETED'
    );
    `;
    const values = [];
    return query(text, values, cb);
};

const create_payment_3ds_status_enum = (config, query, cb) => {
    const text = 
    `
    CREATE TYPE "PAYMENT_3DS_STATUS" AS ENUM (
        'NONE',
        'REQUESTED',
        'PENDING',
        'FAILED',
        'FRAUD',
        'REDIRECTED',
        'UNAVAILABLE',
        'COMPLETED'
    );
    `;
    const values = [];
    return query(text, values, cb);
};

const create_payment_cvv_status_enum = (config, query, cb) => {
    const text = 
    `
    CREATE TYPE "PAYMENT_CVV_STATUS" AS ENUM (
        'NONE',
        'REQUESTED',
        'PENDING',
        'FAILED',
        'FRAUD',
        'UNAVAILABLE',
        'COMPLETED'
    );
    `;
    const values = [];
    return query(text, values, cb);
};

const create_payment_unsecure_status_enum = (config, query, cb) => {
    const text = 
    `
    CREATE TYPE "PAYMENT_UNSECURE_STATUS" AS ENUM (
        'NONE',
        'REQUESTED',
        'PENDING',
        'FAILED',
        'FRAUD',
        'COMPLETED'
    );
    `;
    const values = [];
    return query(text, values, cb);
};

const create_users_table = (config, query, cb) => {
    const text = 
    `
    CREATE TABLE "users" (
        "internal_user_id"                   UUID NOT NULL,                      -- the primary key and internal representation of this user
        "identification_hash"                UUID NOT NULL,                      -- how the user is identified by the integrating service such as neon district (a hash of the user name or id)
        "t_created"                          BIGINT NOT NULL,                    -- when the user record was created
        "t_modified"                         BIGINT NOT NULL,                    -- when the user record was last seen or used
        PRIMARY KEY ("internal_user_id")
    );
    `;
    const values = [];
    return query(text, values, cb);
};

const create_purchases_table = (config, query, cb) => {
    const text = 
    `
    CREATE TABLE "purchases" (
        "internal_purchase_id"               UUID NOT NULL,                      -- the primary key and internal representation of this purchase
        "internal_user_id"                   UUID NOT NULL,                      -- the foreign key of the user making this purchase
        "sale_item_key"                      CHAR(128) NOT NULL,                 -- the key used to represent the item being purchased, essentially a sku such as "NEON_1000_PACK"
        "sale_item_price"                    CHAR(16) NOT NULL,                  -- the amount of usd currency charged for the item as a string such as "1.46" which is how circle handles dollar amounts
        "game_id"                            "GAME_IDENTIFIER" NOT NULL,         -- the id of the game making a purchase
        "t_created_purchase"                 BIGINT NOT NULL,                    -- when the purchase record was created
        "t_modified_purchase"                BIGINT NOT NULL,                    -- when the purchase record was last modified
        "client_generated_idempotency_key"   UUID NOT NULL,                      -- the idempotency key generated by the client for the purchase
        "game_credited_result"               "GAME_CREDITED_STATUS" NOT NULL,    -- once a purchase is completed successully the game must be credited, this tracks the status of applying credit
        "purchase_result"                    "PURCHASE_STATUS" NOT NULL,         -- the overall status of the entire purchase flow
        "t_created_create_card"              BIGINT,                             -- when the create card request was created
        "t_modified_create_card"             BIGINT,                             -- when the create card request was last modified
        "create_card_idempotency_key"        UUID,                               -- the circle integration server generated idempotency key for the create card request
        "create_card_result"                 "CREATE_CARD_STATUS" NOT NULL,      -- the result of the create card request
        "public_key_result"                  "PUBLIC_KEY_STATUS" NOT NULL,       -- if the circle server public key encryption failed, most likely needing to be refreshed due to key expiry
        "create_card_id"                     UUID,                               -- the id returned from circle server as the result of a create card request
        "t_created_payment_3ds"              BIGINT,                             -- when the payment 3ds request was created
        "t_modified_payment_3ds"             BIGINT,                             -- when the payment 3ds request was last modified
        "payment_3ds_idempotency_key"        UUID,                               -- the circle integration server generated idempotency key for the payment 3ds request
        "payment_3ds_result"                 "PAYMENT_3DS_STATUS" NOT NULL,      -- the result of the payment 3ds request
        "payment_3ds_id"                     UUID,                               -- the id returned from circle server as the result of a payment 3ds request
        "t_created_payment_cvv"              BIGINT,                             -- when the payment cvv was created
        "t_modified_payment_cvv"             BIGINT,                             -- when the payment cvv was last modified
        "payment_cvv_idempotency_key"        UUID,                               -- the circle integration server generated idempotency key for the payment cvv request
        "payment_cvv_result"                 "PAYMENT_CVV_STATUS" NOT NULL,      -- the result of the payment cvv request
        "payment_cvv_id"                     UUID,                               -- the id returned from circle server as the result of a payment cvv request
        "t_created_payment_unsecure"         BIGINT,                             -- when the payment unsecure was created
        "t_modified_payment_unsecure"        BIGINT,                             -- when the payment unsecure was last modified
        "payment_unsecure_idempotency_key"   UUID,                               -- the circle integration server generated idempotency key for the payment unsecure request
        "payment_unsecure_result"            "PAYMENT_UNSECURE_STATUS" NOT NULL, -- the result of the payment unsecure request
        "payment_unsecure_id"                UUID,                               -- the id returned from circle server as the result of a payment unsecure request
        "metadata_hash_email"                CHAR(128) NOT NULL,                 -- the hashed email provided by the player
        "metadata_hash_phone"                CHAR(128) NOT NULL,                 -- the hashed phone numbe provided by the player
        "metadata_hash_session_id"           CHAR(128) NOT NULL,                 -- the hashed session id provided by the game server
        "metadata_hash_ip_address"           CHAR(128) NOT NULL,                 -- the hashed ip address provided by the game server
        "metadata_hash_name_on_card"         CHAR(128) NOT NULL,                 -- the hashed name on the payment card
        "metadata_hash_city"                 CHAR(128) NOT NULL,                 -- the hashed city from the billing address
        "metadata_hash_country"              CHAR(128) NOT NULL,                 -- the hashed country from the billing address
        "metadata_hash_district"             CHAR(128) NOT NULL,                 -- the hashed district from the billing address
        "metadata_hash_address_1"            CHAR(128) NOT NULL,                 -- the hashed address line 1 from the billing address
        "metadata_hash_address_2"            CHAR(128) NOT NULL,                 -- the hashed address line 2 from the billing address
        "metadata_hash_postal_zip_code"      CHAR(128) NOT NULL,                 -- the hashed postal or zip code from the billing address
        "metadata_hash_expiry_month"         CHAR(128) NOT NULL,                 -- the hashed expiry month from the billing address
        "metadata_hash_expiry_year"          CHAR(128) NOT NULL,                 -- the hashed expiry year from the billing address
        "metadata_hash_card_number"          CHAR(128) NOT NULL,                 -- the hashed payment card number
        "metadata_hash_circle_public_key_id" CHAR(128) NOT NULL,                 -- the hashed circle public key id used in encryption
        PRIMARY KEY ("internal_purchase_id"),
        UNIQUE ("internal_purchase_id"),
        UNIQUE ("client_generated_idempotency_key"),
        UNIQUE ("create_card_idempotency_key"),
        UNIQUE ("create_card_id"),
        UNIQUE ("payment_3ds_idempotency_key"),
        UNIQUE ("payment_3ds_id"),
        UNIQUE ("payment_cvv_idempotency_key"),
        UNIQUE ("payment_cvv_id"),
        UNIQUE ("payment_unsecure_idempotency_key"),
        UNIQUE ("payment_unsecure_id"),
        CONSTRAINT "fk_internal_user_id" FOREIGN KEY("internal_user_id") REFERENCES "users"("internal_user_id"),
        CONSTRAINT "metadata_hash_email_length"                CHECK (char_length("metadata_hash_email")                = 128),
        CONSTRAINT "metadata_hash_phone_length"                CHECK (char_length("metadata_hash_phone")                = 128),
        CONSTRAINT "metadata_hash_session_id_length"           CHECK (char_length("metadata_hash_session_id")           = 128),
        CONSTRAINT "metadata_hash_ip_address_length"           CHECK (char_length("metadata_hash_ip_address")           = 128),
        CONSTRAINT "metadata_hash_name_on_card_length"         CHECK (char_length("metadata_hash_name_on_card")         = 128),
        CONSTRAINT "metadata_hash_city_length"                 CHECK (char_length("metadata_hash_city")                 = 128),
        CONSTRAINT "metadata_hash_country_length"              CHECK (char_length("metadata_hash_country")              = 128),
        CONSTRAINT "metadata_hash_district_length"             CHECK (char_length("metadata_hash_district")             = 128),
        CONSTRAINT "metadata_hash_address_1_length"            CHECK (char_length("metadata_hash_address_1")            = 128),
        CONSTRAINT "metadata_hash_address_2_length"            CHECK (char_length("metadata_hash_address_2")            = 128),
        CONSTRAINT "metadata_hash_postal_zip_code_length"      CHECK (char_length("metadata_hash_postal_zip_code")      = 128),
        CONSTRAINT "metadata_hash_expiry_month_length"         CHECK (char_length("metadata_hash_expiry_month")         = 128),
        CONSTRAINT "metadata_hash_expiry_year_length"          CHECK (char_length("metadata_hash_expiry_year")          = 128),
        CONSTRAINT "metadata_hash_card_number_length"          CHECK (char_length("metadata_hash_card_number")          = 128),
        CONSTRAINT "metadata_hash_circle_public_key_id_length" CHECK (char_length("metadata_hash_circle_public_key_id") = 128)
    );
    `;
    const values = [];
    return query(text, values, cb);
};

module.exports = create_all_tables = (config, query, cb) => {
    if (!config.dangerous) {
        throw new Error('Dangerous must be enabled to create_all_tables');
    }
    const operations = [
        create_game_identitier_enum,
        create_purchase_status_enum,
        create_game_credited_status_enum,
        create_create_card_status_enum,
        create_public_key_status_enum,
        create_payment_3ds_status_enum,
        create_payment_cvv_status_enum,
        create_payment_unsecure_status_enum,
        create_users_table,
        create_purchases_table
    ];
    const recurse_operations = (operation_index, cb) => {
        operations[operation_index](config, query, (error, result) => {
            if (error) {
                return cb(error);
            }
            if (operation_index + 1 < operations.length) {
                return recurse_operations(operation_index + 1, cb);
            } else {
                return cb(null);
            }
        });
    };
    return recurse_operations(0, cb);
};