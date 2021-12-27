// by setting the address value for line 1 to the test value the described error will occur

module.exports = test_avss = [
    {
        value: 'Test_A',
        result: 'Partial match',
        description: 'Street address matches, but both 5-digit and 9-digit ZIP Code do not match.'
    },
    {
        value: 'Test_B',
        result: 'Partial match',
        description: 'Street Address Match for International Transaction. Postal Code not verified due to incompatible formats.'
    },
    {
        value: 'Test_C',
        result: 'Verification unavailable',
        description: 'Address and Postal Code not verified for International Transaction due to incompatible formats.'
    },
    {
        value: 'Test_D',
        result: 'Full Match (International Transaction)',
        description: 'Address and Postal Code match for International Transaction.'
    },
    {
        value: 'Test_E',
        result: 'Data invalid',
        description: 'AVS data is invalid or AVS is not allowed for this card type.'
    },
    {
        value: 'Test_F',
        result: 'Full Match (UK only)',
        description: 'Street address and postal code match. Applies to U.K. only.'
    },
    {
        value: 'Test_G',
        result: 'Verification unavailable',
        description: 'Non-US Issuer does not participate.'
    },
    {
        value: 'Test_I',
        result: 'Verification unavailable',
        description: 'Address information not verified for international transaction.'
    },
    {
        value: 'Test_K',
        result: 'Address mismatch',
        description: 'Card member\'s name matches but billing address and billing postal code do not match.'
    },
    {
        value: 'Test_L',
        result: 'Partial match',
        description: 'Card member\'s name and billing postal code match, but billing address does not match.'
    },
    {
        value: 'Test_M',
        result: 'Full match (International Transaction)',
        description: 'Street Address match for international transaction. Address and Postal Code match.'
    },
    {
        value: 'Test_N',
        result: 'No match',
        description: 'No match for address or ZIP/postal code.'
    },
    {
        value: 'Test_O',
        result: 'Partial match',
        description: 'Card member\'s name and billing address match, but billing postal code does not match.'
    },
    {
        value: 'Test_P',
        result: 'Partial match (International Transaction)',
        description: 'Postal code match. Acquirer sent both postal code and street address, but street address not verified due to incompatible formats.'
    },
    {
        value: 'Test_R',
        result: 'Verification unavailable',
        description: 'Issuer system unavailable, retry.'
    },
    {
        value: 'Test_S',
        result: 'Verification unavailable',
        description: 'AVS not supported'
    },
    {
        value: 'Test_U',
        result: 'Verification unavailable',
        description: 'Address unavailable'
    },
    {
        value: 'Test_W',
        result: 'Partial match',
        description: 'Postal code matches but address does not match'
    },
    {
        value: 'Test_X',
        result: 'Full match',
        description: 'Street address and postal code match'
    },
    {
        value: 'Test_Y',
        result: 'Full match',
        description: 'Street address and postal code match'
    },
    {
        value: 'Test_Z',
        result: 'Partial match',
        description: '5 digit zip code match only'
    },
    {
        value: 'Test_-',
        result: 'Verification unavailable',
        description: 'An error occurred attempting AVS check'
    }
];