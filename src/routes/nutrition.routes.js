const express = require('express');
const router = express.Router();

const {
    analyzeFoodImage,
    analyzeFoodFromText,
    searchStoredFoods,
    addFoodEntry,
    analyzeAccurateFoodImage
} = require('../controllers/nutrition/food-analysis.controller');
const {
    getFoodEntriesByUserAndDate,
    getAverageNutritionalData,
    getDayWiseMealBreakdown,
    getDailyFoodSummary,
    getFoodSummaryDashboardByDateRange,
    getNutritionDetailsDashboardByDate,
    getMacronutrientsDashboardByDateRange,
    deleteFoodEntry
} = require('../controllers/nutrition/food-entry.controller');
const {
    createMealPlanner,
    getMealPlanner,
    generateMealPlanWithAI,
    saveMealSchedule,
    getMealSchedule,
    addGroceries,
    getUserGroceries,
    deleteMultipleGroceries,
    clearMealPlanner,
    toggleMealScheduleFavorite,
    getFavoriteMealSchedules,
    getUserPersonalFoodProfile,
    updateUserPersonalFoodProfile,
    getMealCalendar,
} = require('../controllers/nutrition/meal-planner.controller');
const {
    generateRecipeFromDishName,
    getAllRecipeHistoryByUser,
    toggleRecipeFavorite,
    getFavoriteRecipesByUser,
    deleteRecipe,
} = require('../controllers/nutrition/recipe.controller');
const {
    addRecipeToMealPlan,
    getRecipesFromMealPlan,
    deleteMealPlanRecipe
} = require('../controllers/nutrition/meal-plan-from-recipe.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { foodImageUpload } = require('../middleware/upload.middleware');
const multer = require('multer');
const { getNutritionDashboard } = require('../controllers/nutrition/dashboard.controller');
const upload = multer({ dest: 'uploads/' });

// Food Entry
router.post('/analyzeFoodImage', verifyToken, upload.single("image"), analyzeFoodImage);
router.post('/analyzeAccurateFoodImage', verifyToken, upload.single("image"), analyzeAccurateFoodImage);
router.post('/analyzeFoodFromText', verifyToken, analyzeFoodFromText);
router.get('/searchStoredFoods', verifyToken, searchStoredFoods);
router.post('/addFoodEntry', verifyToken, foodImageUpload.single('food_image'), addFoodEntry);

// Food Analysis (dashboard)
router.get('/getFoodEntriesByUserAndDate', verifyToken, getFoodEntriesByUserAndDate);
router.get('/getAverageNutritionalData', verifyToken, getAverageNutritionalData);
router.get('/getDayWiseMealBreakdown', verifyToken, getDayWiseMealBreakdown);
router.get('/getDailyFoodSummary', verifyToken, getDailyFoodSummary);
router.get('/getFoodSummaryDashboardByDateRange', verifyToken, getFoodSummaryDashboardByDateRange);
router.get('/getNutritionDetailsDashboardByDate', verifyToken, getNutritionDetailsDashboardByDate);
router.get('/getMacronutrientsDashboardByDateRange', verifyToken, getMacronutrientsDashboardByDateRange);
router.delete('/deleteFoodEntry/:id', verifyToken, deleteFoodEntry);

// Recipe
router.post('/generateRecipeFromDishName', verifyToken, generateRecipeFromDishName);
router.get('/getAllRecipeHistoryByUser', verifyToken, getAllRecipeHistoryByUser);
router.patch('/toggleRecipeFavorite/:id', verifyToken, toggleRecipeFavorite);
router.get('/getFavoriteRecipesByUser', verifyToken, getFavoriteRecipesByUser);
router.post('/addRecipeToMealPlan', verifyToken, addRecipeToMealPlan);
router.get('/getRecipesFromMealPlan', verifyToken, getRecipesFromMealPlan);
router.delete('/deleteRecipe/:id', verifyToken, deleteRecipe);
router.delete('/deleteMealPlanRecipe/:id', verifyToken, deleteMealPlanRecipe);

// Meal Planner routes
router.post('/createMealPlanner', verifyToken, createMealPlanner);
router.get('/generateMealPlanWithAI', verifyToken, generateMealPlanWithAI);
router.get('/getMealPlanner', verifyToken, getMealPlanner);
router.post('/saveMealSchedule', verifyToken, saveMealSchedule);
router.get('/getMealSchedule', verifyToken, getMealSchedule);
router.post('/addGroceries', verifyToken, addGroceries);
router.get('/getUserGroceries', verifyToken, getUserGroceries);
router.delete('/deleteMultipleGroceries', verifyToken, deleteMultipleGroceries);
router.delete('/clearMealPlanner', verifyToken, clearMealPlanner);
router.patch('/toggleMealScheduleFavorite/:id', verifyToken, toggleMealScheduleFavorite);
router.get('/getFavoriteMealSchedules', verifyToken, getFavoriteMealSchedules);
router.get('/getUserPersonalFoodProfile', verifyToken, getUserPersonalFoodProfile);
router.put('/updateUserPersonalFoodProfile', verifyToken, updateUserPersonalFoodProfile);
router.get('/getMealCalendar', verifyToken, getMealCalendar);

// dashboard
router.get('/getNutritionDashboard', verifyToken, getNutritionDashboard);

module.exports = router;
