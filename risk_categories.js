module.exports = risk_categories = [
    {
        category: 'Circle Unsupported',
        description: 'Fiat Account / Payment contains criteria that Circle is unable to support at this time. E.g. Prohibited Country.',
        range: {
            lower_inclusive: 3000,
            upper_inclusive: 3099
        },
        specific_reasons: [
            {
                code: 3000,
                description: 'Default',
            },
            {
                code: 3001,
                description: 'Prohibited Issuer (Bank) Country',
            },
            {
                code: 3002,
                description: 'Prohibited Billing Address Country',
            },
            {
                code: 3020,
                description: 'Fiat Account Denied (See Fiat Account for Reason)',
            },
            {
                code: 3021,
                description: 'Fiat Account Failed (See Fiat Account for Reason)',
            },
            {
                code: 3022,
                description: 'Fiat Account (Card) Evaluation Timeout. We recommend retrying.',
            },
            {
                code: 3023,
                description: 'Fiat Account (Bank Account) Evaluation Timeout. We recommend retrying.',
            },
            {
                code: 3024,
                description: 'Fiat Account Evaluation Suspended. Information has been requested or fiat is awaiting review.',
            },
            {
                code: 3030,
                description: 'Unsupported Bank Account Routing Number (rtn)',
            },
            {
                code: 3050,
                description: 'Customer suspended from Payment Processing',
            },
            {
                code: 3070,
                description: 'Limit for Transaction exceeded',
            },
            {
                code: 3071,
                description: 'Limit for Daily Aggregate exceeded (email)',
            },
            {
                code: 3072,
                description: 'Limit for Daily Aggregate exceeded (fiat)',
            },
            {
                code: 3075,
                description: 'Limit for Weekly Aggregate exceeded (email)',
            },
            {
                code: 3076,
                description: 'Limit for Weekly Aggregate exceeded (fiat)',
            }
        ]
    },
    {
        category: 'Processor / Issuing Bank',
        description: 'Fiat Account / Payment creation contains criteria that Circles processor partner or Issuing Bank are unable to accept. E.g. unsupported issuer country, authorization failure.',
        range: {
            lower_inclusive: 3100,
            upper_inclusive: 3199
        },
        specific_reasons: [
            {
                code: 3100,
                description: 'Unsupported Return Code Response from Processor / Issuing Bank - Default'
            },
            {
                code: 3101,
                description: 'Invalid Return Code Response from Issuing Bank E.g Invalid Card'
            },
            {
                code: 3102,
                description: 'Fraudulent Return Code Response from Issuing Bank E.g Pickup Card'
            },
            {
                code: 3103,
                description: 'Redlisted Entity Return Code Response from Processor E.g Card Redlisted'
            },
            {
                code: 3104,
                description: 'Account associated with an invalid ACH RTN'
            },
            {
                code: 3150,
                description: 'Administrative return from ODFI / RDFI'
            },
            {
                code: 3151,
                description: 'Return indicating ineligible account from customer / RDFI'
            },
            {
                code: 3152,
                description: 'Unsupported transaction type return from customer / RDFI'
            }
        ]
    },
    {
        category: 'Regulatory Compliance Intervention',
        description: 'Interventions by Circle Risk Service due to legal & regulatory compliance requirements. E.g. KYC verification limits.',
        range: {
            lower_inclusive: 3200,
            upper_inclusive: 3299
        },
        specific_reasons: [
            {
                code: 3200,
                description: 'Unsupported Criteria'
            },
            {
                code: 3201,
                description: 'Unsupported Criteria'
            },
            {
                code: 3202,
                description: 'Unsupported Criteria'
            },
            {
                code: 3210,
                description: 'Withdrawal Limit Exceeded (7 Day Default Payout Limit)'
            },
            {
                code: 3211,
                description: 'Withdrawal Limit Exceeded (7 Day Custom Payout Limit)'
            },
            {
                code: 3220,
                description: 'Compliance Limit Exceeded'
            }
        ]
    },
    {
        category: 'Fraud Risk Intervention',
        description: 'Fiat Account / Payment creation was actioned by Circles Risk Service due to identified fraud management issues. E.g. Excessive Chargeback Rates, Immediate Fraud Pressure.',
        range: {
            lower_inclusive: 3300,
            upper_inclusive: 3499
        },
        specific_reasons: [
            {
                code: 3300,
                description: 'Transaction Declined by Circle Risk Service'
            },
            {
                code: 3310,
                description: 'Fiat Account directly associated with fraudulent activity'
            },
            {
                code: 3311,
                description: 'Email Address directly associated with fraudulent activity'
            },
            {
                code: 3320,
                description: 'Fiat Account associated with network fraud notification'
            },
            {
                code: 3321,
                description: 'Email Account associated with network fraud notification'
            },
            {
                code: 3330,
                description: 'Fiat Account flagged by Risk Team'
            },
            {
                code: 3331,
                description: 'Email Account flagged by Risk team'
            },
            {
                code: 3340,
                description: 'Fiat Account linked to previous fraudulent activity'
            },
            {
                code: 3341,
                description: 'Email Address linked to previous fraudulent activity'
            }
        ]
    },
    {
        category: 'Customer Unsupported Configurations',
        description: 'Fiat Account / Payment creation was actioned by Circles Risk Service due to customer configuration on block list where associated entity was labelled "unsupported". E.g. Block Issuer Country, Block Card Type, etc.',
        range: {
            lower_inclusive: 3500,
            upper_inclusive: 3599
        },
        specific_reasons: [
            {
                code: 3500,
                description: 'Blocked Issuer (Bank) Country'
            },
            {
                code: 3501,
                description: 'Blocked Billing Address Country'
            },
            {
                code: 3520,
                description: 'Blocked Card Type E.g. Credit'
            },
            {
                code: 3530,
                description: 'Chargeback History on Circle Platform'
            },
            {
                code: 3531,
                description: 'Chargeback History on Circle Platform'
            },
            {
                code: 3532,
                description: 'Chargeback History on Circle Platform'
            },
            {
                code: 3533,
                description: 'Chargeback History on Circle Platform'
            },
            {
                code: 3534,
                description: 'Chargeback History on Circle Platform'
            },
            {
                code: 3535,
                description: 'Chargeback History on Circle Platform'
            },
            {
                code: 3536,
                description: 'Chargeback History on Circle Platform'
            },
            {
                code: 3537,
                description: 'Chargeback History on Circle Platform'
            },
            {
                code: 3538,
                description: 'Chargeback History on Circle Platform'
            },
            {
                code: 3539,
                description: 'Chargeback History on Circle Platform'
            },
            {
                code: 3540,
                description: 'Chargeback History on Customer Platform'
            },
            {
                code: 3541,
                description: 'Chargeback History on Customer Platform'
            },
            {
                code: 3542,
                description: 'Chargeback History on Customer Platform'
            },
            {
                code: 3543,
                description: 'Chargeback History on Customer Platform'
            },
            {
                code: 3544,
                description: 'Chargeback History on Customer Platform'
            },
            {
                code: 3545,
                description: 'Chargeback History on Customer Platform'
            },
            {
                code: 3546,
                description: 'Chargeback History on Customer Platform'
            },
            {
                code: 3547,
                description: 'Chargeback History on Customer Platform'
            },
            {
                code: 3548,
                description: 'Chargeback History on Customer Platform'
            },
            {
                code: 3549,
                description: 'Chargeback History on Customer Platform'
            },
            {
                code: 3550,
                description: 'Blocked Fiat (Card)'
            },
            {
                code: 3551,
                description: 'Blocked Email Address'
            },
            {
                code: 3552,
                description: 'Blocked Phone Number'
            }
        ]
    },
    {
        category: 'Customer Fraud Configurations',
        description: 'Fiat Account / Payment creation was actioned by Circles Risk Service due to customer configuration on block list where associated entity was labelled "fraud". E.g. Block Issuer Country, Block Card Type, etc.',
        range: {
            lower_inclusive: 3600,
            upper_inclusive: 3699
        },
        specific_reasons: [
            // all codes are just described as 'Blocked by fraud watchlist'
        ]
    }
];