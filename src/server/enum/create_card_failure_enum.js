module.exports = create_card_failure_enum = {
    VERIFICATION_FAILED: 'verification_failed', 
    VERIFICATION_FRAUD_DETECTED: 'verification_fraud_detected', 
    VERIFICATION_DENIED: 'verification_denied', 
    VERIFICATION_NOT_SUPPORTED_BY_ISSUER: 'verification_not_supported_by_issuer', 
    VERIFICATION_STOPPED_BY_ISSUER: 'verification_stopped_by_issuer', 
    CARD_FAILED: 'card_failed', 
    CARD_INVALID: 'card_invalid', 
    CARD_ADDRESS_MISMATCH: 'card_address_mismatch', 
    CARD_ZIP_MISMATCH: 'card_zip_mismatch', 
    CARD_CVV_INVALID: 'card_cvv_invalid', 
    CARD_EXPIRED: 'card_expired', 
    CARD_LIMIT_VIOLATED: 'card_limit_violated', 
    CARD_NOT_HONORED: 'card_not_honored', 
    CARD_CVV_REQUIRED: 'card_cvv_required', 
    CREDIT_CARD_NOT_ALLOWED: 'credit_card_not_allowed', 
    CARD_ACCOUNT_INELIGIBLE: 'card_account_ineligible', 
    CARD_NETWORK_UNSUPPORTED: 'card_network_unsupported'
};