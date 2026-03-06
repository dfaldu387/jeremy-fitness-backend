const userMembershipCron = require("./userMembership.cron");
const recipeHistoryCron = require("./recipeHistory.cron");

const startCrons = () => {
    console.log("Starting all cron jobs...");
    userMembershipCron();
    recipeHistoryCron();
};

module.exports = startCrons;
