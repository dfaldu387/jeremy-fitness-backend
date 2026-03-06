const MembershipContent = require('../models/membershipContent.model');
const UserMembership = require('../models/userMembership.model');
const { responseSuccess, responseError } = require('../utils/response');

exports.getMemberships = async (req, res) => {
    try {
        const memberships = await MembershipContent.findAll({
            attributes: ['id', 'title', 'features', 'amount', 'planType'],
            order: [['created_date', 'DESC']]
        });

        const formattedMemberships = memberships.map(m => m.toJSON());

        return responseSuccess(res, 200, "Memberships fetched successfully", formattedMemberships);
    } catch (err) {
        return responseError(res, 500, "Failed to fetch memberships", err.message);
    }
};

exports.addUserMembership = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { membershipId, paymentId, paymentAmount, planType, startDate, endDate } = req.body;

        if (!userId || !membershipId || !paymentAmount || !planType) {
            return responseError(res, 400, "Missing required fields: userId, membershipId, paymentAmount, planType");
        }

        const membership = await MembershipContent.findByPk(membershipId);
        if (!membership) {
            return responseError(res, 404, "Membership not found");
        }

        const existingMembership = await UserMembership.findOne({
            where: {
                user_id: userId,
                membership_id: membershipId,
                is_active: true
            }
        });

        if (existingMembership) {
            return responseSuccess(res, 200, "User already has this membership", existingMembership);
        }

        const start_date = startDate ? new Date(startDate) : new Date();
        let end_date = new Date(start_date);

        if (planType === "monthly") {
            end_date.setMonth(end_date.getMonth() + 1);
        } else if (planType === "yearly") {
            end_date.setFullYear(end_date.getFullYear() + 1);
        }

        end_date.setHours(0, 0, 0, 0);

        const userMembership = await UserMembership.create({
            user_id: userId,
            membership_id: membershipId || null,
            payment_id: paymentId || null,
            payment_amount: paymentAmount,
            payment_status: 'completed',
            planType,
            start_date: startDate || new Date(),
            end_date: end_date,
            is_active: true
        });

        return responseSuccess(res, 201, "User membership added successfully", userMembership);

    } catch (err) {
        return responseError(res, 500, "Failed to add user membership", err.message);
    }
};

exports.getAllMemberships = async (req, res) => {
    try {
        const activeMemberships = await UserMembership.findAll({
            where: { is_active: true },
            include: {
                model: MembershipContent,
                attributes: ['id', 'title', 'features', 'amount', 'planType'],
            },
            order: [['created_date', 'DESC']]
        });

        const allMemberships = await MembershipContent.findAll({
            attributes: ['id', 'title', 'features', 'amount', 'planType', 'stripeProductId'],
            order: [['created_date', 'DESC']]
        });

        const formattedActiveMemberships = activeMemberships.map(m => m.toJSON());
        const formattedAllMemberships = allMemberships.map(m => m.toJSON());

        return responseSuccess(res, 200, "Memberships fetched successfully", {
            activeMemberships: formattedActiveMemberships,
            allMemberships: formattedAllMemberships
        });
    } catch (err) {
        return responseError(res, 500, "Failed to fetch memberships", err.message);
    }
};

exports.cancelUserMembership = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { membershipId } = req.body;

        if (!userId || !membershipId) {
            return responseError(res, 400, "Missing required fields: userId, membershipId");
        }

        const existingMembership = await UserMembership.findOne({
            where: {
                user_id: userId,
                membership_id: membershipId,
                is_active: true
            }
        });

        if (!existingMembership) {
            return responseError(res, 404, "Active membership not found for this user");
        }

        existingMembership.is_active = false;
        existingMembership.end_date = new Date();
        await existingMembership.save();

        return responseSuccess(res, 200, "Membership cancelled successfully", existingMembership);

    } catch (err) {
        return responseError(res, 500, "Failed to cancel membership", err.message);
    }
};