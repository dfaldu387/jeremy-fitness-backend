const cron = require("node-cron");
const UserMembership = require("../models/userMembership.model");
const { Op } = require("sequelize");

const userMembershipCron = () => {
    // Run at 12:01 AM and 12:01 PM every day
    cron.schedule("1 0,12 * * *", async () => { // minute 1, hour 0 and 12
        try {
            const now = new Date();

            // Update all memberships whose end_date is in the past
            const [updatedCount] = await UserMembership.update(
                { is_active: false },
                {
                    where: {
                        end_date: { [Op.lte]: now },
                        is_active: true,
                    },
                }
            );

            if (updatedCount > 0) {
                console.log(`Membership cron executed: ${updatedCount} memberships deactivated`);
            } else {
                console.log("Membership cron executed: No memberships to deactivate");
            }
        } catch (err) {
            console.error("Membership cron failed:", err);
        }
    });
};

module.exports = userMembershipCron;
