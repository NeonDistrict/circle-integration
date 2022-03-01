module.exports = {
    type: 'string',
    enum: [
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
    ]
};