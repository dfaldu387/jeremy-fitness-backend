const cron = require("node-cron");
const RecipeHistory = require("../models/recipeHistory.model");
const { Op } = require("sequelize");

const recipeHistoryCron = () => {
    cron.schedule("1 0 * * *", async () => {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const deletedCount = await RecipeHistory.destroy({
                where: {
                    created_date: { [Op.lt]: thirtyDaysAgo },
                },
            });

            if (deletedCount > 0) {
                console.log(`Recipe history cron executed: ${deletedCount} recipes deleted (older than 30 days)`);
            } else {
                console.log("Recipe history cron executed: No old recipes to delete");
            }
        } catch (err) {
            console.error("Recipe history cron failed:", err);
        }
    });
};

module.exports = recipeHistoryCron;
