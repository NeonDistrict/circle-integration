// by setting the address value for line 1 to the test value the described error will occur

module.exports = test_avss = {
    TEST_A: {
        value: 'Test_A',
        result: 'Partial match',
        description: 'Street address matches, but both 5-digit and 9-digit ZIP Code do not match.'
    },
    TEST_B: {
        value: 'Test_B',
        result: 'Partial match',
        description: 'Street Address Match for International Transaction. Postal Code not verified due to incompatible formats.'
    },
    TEST_C: {
        value: 'Test_C',
        result: 'Verification unavailable',
        description: 'Address and Postal Code not verified for International Transaction due to incompatible formats.'
    },
    TEST_D: {
        value: 'Test_D',
        result: 'Full Match (International Transaction)',
        description: 'Address and Postal Code match for International Transaction.'
    },
    TEST_E: {
        value: 'Test_E',
        result: 'Data invalid',
        description: 'AVS data is invalid or AVS is not allowed for this card type.'
    },
    TEST_F: {
        value: 'Test_F',
        result: 'Full Match (UK only)',
        description: 'Street address and postal code match. Applies to U.K. only.'
    },
    TEST_G: {
        value: 'Test_G',
        result: 'Verification unavailable',
        description: 'Non-US Issuer does not participate.'
    },
    TEST_I: {
        value: 'Test_I',
        result: 'Verification unavailable',
        description: 'Address information not verified for international transaction.'
    },
    TEST_K: {
        value: 'Test_K',
        result: 'Address mismatch',
        description: 'Card member\'s name matches but billing address and billing postal code do not match.'
    },
    TEST_L: {
        value: 'Test_L',
        result: 'Partial match',
        description: 'Card member\'s name and billing postal code match, but billing address does not match.'
    },
    TEST_M: {
        value: 'Test_M',
        result: 'Full match (International Transaction)',
        description: 'Street Address match for international transaction. Address and Postal Code match.'
    },
    TEST_N: {
        value: 'Test_N',
        result: 'No match',
        description: 'No match for address or ZIP/postal code.'
    },
    TEST_O: {
        value: 'Test_O',
        result: 'Partial match',
        description: 'Card member\'s name and billing address match, but billing postal code does not match.'
    },
    TEST_P: {
        value: 'Test_P',
        result: 'Partial match (International Transaction)',
        description: 'Postal code match. Acquirer sent both postal code and street address, but street address not verified due to incompatible formats.'
    },
    TEST_R: {
        value: 'Test_R',
        result: 'Verification unavailable',
        description: 'Issuer system unavailable, retry.'
    },
    TEST_S: {
        value: 'Test_S',
        result: 'Verification unavailable',
        description: 'AVS not supported'
    },
    TEST_U: {
        value: 'Test_U',
        result: 'Verification unavailable',
        description: 'Address unavailable'
    },
    TEST_W: {
        value: 'Test_W',
        result: 'Partial match',
        description: 'Postal code matches but address does not match'
    },
    TEST_X: {
        value: 'Test_X',
        result: 'Full match',
        description: 'Street address and postal code match'
    },
    TEST_Y: {
        value: 'Test_Y',
        result: 'Full match',
        description: 'Street address and postal code match'
    },
    TEST_Z: {
        value: 'Test_Z',
        result: 'Partial match',
        description: '5 digit zip code match only'
    },
    'TEST_-': {
        value: 'Test_-',
        result: 'Verification unavailable',
        description: 'An error occurred attempting AVS check'
    }
};