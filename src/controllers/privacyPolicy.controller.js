const PrivacyPolicy = require('../models/privacyPolicy.model');
const { User } = require('../models/associations');
const { responseSuccess, responseError } = require('../utils/response');

exports.addPrivacyPolicy = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return responseError(res, 400, "User ID missing from token");
    }

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ['password', 'otp', 'otpExpiry', 'resetPasswordToken', 'resetPasswordExpires', 'isOtpVerifiedForReset']
      }
    });

    if (!user) {
      return responseError(res, 404, "User not found");
    }

    const {
      healthAndWellnessDisclaimer,
      AITransparency,
      dataAndPrivacy,
      digitalRewardsAndCollectibles,
      termsAndConsentTermsAndConditions,
      termsAndConsentPrivacyPolicy,
      termsAndConsentCookiePolicy,
      termsAndConsentRiskDisclosure
    } = req.body;

    if (!termsAndConsentPrivacyPolicy) {
      return responseError(res, 400, "Privacy policy must be accepted to proceed");
    }

    if (
      healthAndWellnessDisclaimer === undefined ||
      AITransparency === undefined ||
      dataAndPrivacy === undefined ||
      digitalRewardsAndCollectibles === undefined ||
      termsAndConsentTermsAndConditions === undefined ||
      termsAndConsentPrivacyPolicy === undefined ||
      termsAndConsentCookiePolicy === undefined ||
      termsAndConsentRiskDisclosure === undefined
    ) {
      return responseError(res, 400, "All consent fields are required");
    }

    let consent = await PrivacyPolicy.findOne({ where: { user_id: userId } });

    const consentData = {
      user_id: userId,
      healthAndWellnessDisclaimer,
      AITransparency,
      dataAndPrivacy,
      digitalRewardsAndCollectibles,
      termsAndConsentTermsAndConditions,
      termsAndConsentPrivacyPolicy,
      termsAndConsentCookiePolicy,
      termsAndConsentRiskDisclosure
    };

    if (consent) {
      await consent.update(consentData);
    } else {
      consent = await PrivacyPolicy.create(consentData);
    }

    const responseData = {
      user: user,
      consent: consent
    };

    return responseSuccess(res, 200, "Consent submitted successfully", responseData);

  } catch (error) {
    return responseError(res, 500, "Internal server error", error.message);
  }
};
