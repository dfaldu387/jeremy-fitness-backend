const { User, Referral } = require('../models/associations');
const { responseSuccess, responseError } = require('../utils/response');

exports.getReferralData = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return responseError(res, 404, 'User not found');

    const referrals = await Referral.findAll({
      where: { referrer_id: user.id },
      include: [{ model: User, as: 'referee', attributes: ['id', 'name', 'email'] }]
    });

    const totalPoints = referrals
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.points || 0), 0);

    const totalReferrals = referrals.length;
    const totalCompletedReferrals = referrals.filter(r => r.status === 'completed').length;

    const enrichedReferrals = await Promise.all(
      referrals.map(async (ref) => {
        const referralCount = ref.referee?.id
          ? await Referral.count({ where: { referrer_id: ref.referee.id } })
          : 0;

        return {
          id: ref.id,
          email: ref.email,
          name: ref.referee?.name || ref.name || null,
          status: ref.status,
          points: ref.points || 0,
          joinedAt: ref.joinedAt || null,
          referralCount
        };
      })
    );

    const base = "https://fitness-app.denish-faldu.in";

    return responseSuccess(res, 200, "Referral data fetched successfully", {
      referralCode: user.referralCode,
      referralLink: `${base}/signup?ref=${user.referralCode}`,
      totalPoints,
      totalReferrals,
      totalCompletedReferrals,
      referrals: enrichedReferrals
    });
  } catch (err) {
    return responseError(res, 500, "Failed to fetch referral data", err.message);
  }
};
