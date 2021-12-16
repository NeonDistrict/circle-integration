module.exports = test_amounts = {
    PAYMENT_FAILED: {
        amount: '5.01',
        description: 'Payment failed due to unspecified error'
    },
    CARD_NOT_HONORED: {
        amount: '5.04',
        description: 'Contact card issuer to query why payment failed'
    },
    PAYMENT_NOT_SUPPORTED_BY_ISSUER: {
        amount: '5.05',
        description: 'Issuer did not support the payment'
    },
    PAYMENT_NOT_FUNDED: {
        amount: '5.07',
        description: 'Insufficient funds in account to fund payment'
    },
    CARD_INVALID: {
        amount: '5.19',
        description: 'Invalid card number'
    },
    CARD_LIMIT_VIOLATED: {
        amount: '5.41',
        description: 'Exceeded amount or frequency limits'
    },
    PAYMENT_DENIED: {
        amount: '5.43',
        description: 'Payment denied by Circle Risk Service or card processor risk controls'
    },
    PAYMENT_FRAUD_DETECTED: {
        amount: '5.51',
        description: 'Payment suspected of being associated with fraud'
    },
    CREDIT_CARD_NOT_ALLOWED: {
        amount: '5.54',
        description: 'Issuer did not support using a credit card for payment'
    },
    PAYMENT_STOPPED_BY_ISSUER: {
        amount: '5.57',
        description: 'A stop has been placed on the payment or card'
    },
    CARD_ACCOUNT_INELIGIBLE: {
        amount: '5.84',
        description: 'Ineligible account associated with card'
    }
};