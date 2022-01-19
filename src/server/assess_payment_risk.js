const risk_categories = require('./enum/risk_categories.js');

module.exports = assess_payment_risk = (payment_result) => {
    // if a risk evaluation is present, along with a decision, and that decision is denied we have failed the payment from risk, determine why
    if (payment_result.hasOwnProperty('riskEvaluation') && payment_result.riskEvalutaion.hasOwnProperty('decision') && payment_result.riskEvalutaion.decision === 'denied') {
        const reason_code = result.riskEvalutaion.reason;

        // attempt to find the risk category
        let found_risk_category = null;
        for (const risk_category in risk_categories) {
            
            // if the reason code is in the range for this category we found the category
            if (reason_code >= risk_category.range.lower_inclusive && reason_code <= risk_category.range.upper_inclusive) {
                found_risk_category = risk_category;
                break;
            }
        }

        // if we did not find the risk category we have an unexpected risk code, crash
        if (found_risk_category === null) {
            return {
                error: 'Unexpected Risk Code'
            }; 
        }

        // reaching here implies we have a found_risk_category, attempt to find a specific reason
        let found_specific_reason = null;
        for (const specific_reason in found_risk_category.specific_reasons) {
            
            // if the specific reason code matches we found the specific reason
            if (specific_reason.code === reason_code) {
                found_specific_reason = specific_reason;
                break;
            }
        }

        // we may or may not have found a specific reason, but the category is all that is gauranteed
        // return whatever we have
        let description = null;
        if (found_specific_reason === null) {
            description = found_risk_category.description;
        } else {
            description = found_specific_reason.description;
        }
        return {
            error: `${reason_code} ${found_risk_category.category}: ${description}`,
        };

    // reaching here implies there was no risk evaluation, or nested decision, or the decision was not denied, meaning no risk, return null to inidicate no risk
    } else {
        return null;
    }
};