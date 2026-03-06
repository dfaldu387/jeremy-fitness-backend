const {
    CoachConversation,
    CoachMessage,
    FavoriteMessage,
    WellnessPoints,
    UserLevel,
} = require('../models/coachAssociations');
const {
    User,
    FoodEntry,
    NutritionalInfo,
} = require('../models/associations');
const MealSchedule = require('../models/userMealSchedule.model');
const RecipeHistory = require('../models/recipeHistory.model');
const Groceries = require('../models/groceriesMeal.model');
const SavedRecipe = require('../models/savedRecipe.model');
const MealPlanner = require('../models/mealPlanner.model');
const { responseSuccess, responseError } = require('../utils/response');
const { Op } = require('sequelize');
const {
    classifyQuestion,
    buildSystemPrompt,
    findInternalResponse,
    findTrainingResponse
} = require('../controllers/nutrition/helpers/nutritionCoach-prompts');
const { encode } = require('gpt-tokenizer');

const countTokens = (text) => {
    if (!text) return 0;
    return encode(text).length;
};

const getSevenDaysAgo = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    date.setHours(0, 0, 0, 0);
    return date;
};

const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const fetchUserProfile = async (userId) => {
    const user = await User.findByPk(userId, {
        attributes: [
            'name', 'prefferedName', 'gender', 'birthdate',
            'height', 'weight', 'wellnessGoals', 'wellnessConsiderations',
            'allergiesAndSensitivities', 'nutritionStyle', 'dietaryPreference',
            'dailyActivityLevel'
        ]
    });
    return user ? user.toJSON() : null;
};

const fetchRecentFoodEntries = async (userId, days = 7) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = new Date().toISOString().split('T')[0];

    const foodEntries = await FoodEntry.findAll({
        where: {
            user_id: userId,
            date: { [Op.between]: [startDateStr, endDateStr] }
        },
        include: [{
            model: NutritionalInfo,
            as: 'nutritionalInfo',
            attributes: ['nutrient_name', 'amount', 'unit', 'daily_value_percent']
        }],
        order: [['date', 'DESC'], ['food_time', 'DESC']]
    });

    return foodEntries.map(entry => entry.toJSON());
};

const fetchMealSchedule = async (userId, days = 7) => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const endDate = new Date();
    endDate.setDate(today.getDate() + 7);
    const endDateStr = endDate.toISOString().split('T')[0];

    const mealSchedules = await MealSchedule.findAll({
        where: {
            user_id: userId,
            date: { [Op.between]: [startDateStr, endDateStr] }
        },
        order: [['date', 'ASC'], ['time', 'ASC']],
        attributes: ['id', 'date', 'time', 'meal', 'dish_name', 'description', 'nutrition_facts', 'is_favorite']
    });

    return mealSchedules.map(schedule => schedule.toJSON());
};

const fetchRecipeHistory = async (userId, days = 30) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const recipes = await RecipeHistory.findAll({
        where: {
            user_id: userId,
            date: { [Op.gte]: startDateStr }
        },
        order: [['created_date', 'DESC']],
        limit: 20,
        attributes: ['id', 'date', 'dish_name', 'description', 'recipe_type', 'nutrition_facts', 'is_favorite', 'ingredients', 'prep_time_minutes', 'cook_time_minutes']
    });

    return recipes.map(recipe => recipe.toJSON());
};

const fetchSavedRecipes = async (userId) => {
    const savedRecipes = await SavedRecipe.findAll({
        where: {
            user_id: userId,
            is_active: true
        },
        order: [['is_preferred', 'DESC'], ['created_date', 'DESC']],
        limit: 15,
        attributes: ['id', 'dish_name', 'description', 'nutrition_facts', 'dietary_preferences', 'is_preferred', 'ingredients']
    });

    return savedRecipes.map(recipe => recipe.toJSON());
};

const fetchUserGroceries = async (userId, days = 14) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const groceries = await Groceries.findAll({
        where: {
            user_id: userId,
            status: 'active',
            grocery_date: { [Op.gte]: startDateStr }
        },
        order: [['created_date', 'DESC']],
        limit: 50,
        attributes: ['id', 'item', 'quantity', 'grocery_date']
    });

    return groceries.map(grocery => grocery.toJSON());
};

const fetchMealPlannerPreferences = async (userId) => {
    const mealPlanner = await MealPlanner.findOne({
        where: { user_id: userId },
        order: [['created_date', 'DESC']],
        attributes: ['food_restrictions', 'food_allergies', 'food_preferences', 'nutrition_goals']
    });

    return mealPlanner ? mealPlanner.toJSON() : null;
};

const nutrientMapping = {
    calories: ['calorie', 'calories', 'kcal', 'energy'],
    carbohydrates: ['carbohydrate', 'carbohydrates', 'carbs', 'total carbohydrate'],
    fat: ['fat', 'total fat'],
    protein: ['protein', 'proteins'],
    fiber: ['fiber', 'dietary fiber', 'fibre'],
    sugar: ['sugar', 'sugars', 'total sugar'],
    sodium: ['sodium'],
    cholesterol: ['cholesterol'],
    saturated_fat: ['saturated fat', 'saturated'],
    unsaturated_fat: ['unsaturated fat', 'unsaturated']
};

const aggregateNutritionDashboard = (foodEntries) => {
    const weeklyTotals = {
        calories: 0,
        carbohydrates: 0,
        fat: 0,
        protein: 0,
        fiber: 0,
        sugar: 0,
        water_intake: 0
    };

    const dailyData = {};

    foodEntries.forEach(entry => {
        const date = entry.date;
        if (!dailyData[date]) {
            dailyData[date] = {
                date,
                meals: [],
                calories: 0,
                carbohydrates: 0,
                fat: 0,
                protein: 0,
                water_intake: 0
            };
        }

        dailyData[date].meals.push({
            food_name: entry.food_name,
            food_type: entry.food_type,
            food_time: entry.food_time
        });

        dailyData[date].water_intake += parseFloat(entry.water_content_ml || 0);
        weeklyTotals.water_intake += parseFloat(entry.water_content_ml || 0);

        if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
            entry.nutritionalInfo.forEach(nutrient => {
                const nutrientNameLower = nutrient.nutrient_name?.toLowerCase() || '';
                const amount = parseFloat(nutrient.amount || 0);

                Object.keys(nutrientMapping).forEach(field => {
                    const aliases = nutrientMapping[field];
                    const isMatch = aliases.some(alias => nutrientNameLower.includes(alias));
                    if (isMatch) {
                        if (dailyData[date][field] !== undefined) {
                            dailyData[date][field] += amount;
                        }
                        if (weeklyTotals[field] !== undefined) {
                            weeklyTotals[field] += amount;
                        }
                    }
                });
            });
        }
    });

    const daysWithData = Object.keys(dailyData).length || 1;
    const dailyAverages = {
        calories: Math.round(weeklyTotals.calories / daysWithData),
        carbohydrates: Math.round(weeklyTotals.carbohydrates / daysWithData),
        fat: Math.round(weeklyTotals.fat / daysWithData),
        protein: Math.round(weeklyTotals.protein / daysWithData),
        fiber: Math.round(weeklyTotals.fiber / daysWithData),
        water_intake: Math.round(weeklyTotals.water_intake / daysWithData)
    };

    const totalMacroGrams = weeklyTotals.carbohydrates + weeklyTotals.fat + weeklyTotals.protein;
    const macroPercentages = {
        carbohydrates: totalMacroGrams > 0 ? Math.round((weeklyTotals.carbohydrates / totalMacroGrams) * 100) : 0,
        fat: totalMacroGrams > 0 ? Math.round((weeklyTotals.fat / totalMacroGrams) * 100) : 0,
        protein: totalMacroGrams > 0 ? Math.round((weeklyTotals.protein / totalMacroGrams) * 100) : 0
    };

    return {
        dailyData: Object.values(dailyData).sort((a, b) => new Date(b.date) - new Date(a.date)),
        weeklyTotals: {
            calories: Math.round(weeklyTotals.calories),
            carbohydrates: Math.round(weeklyTotals.carbohydrates),
            fat: Math.round(weeklyTotals.fat),
            protein: Math.round(weeklyTotals.protein),
            fiber: Math.round(weeklyTotals.fiber),
            water_intake: Math.round(weeklyTotals.water_intake)
        },
        dailyAverages,
        macroPercentages,
        totalEntries: foodEntries.length,
        daysLogged: daysWithData
    };
};

const buildUserContext = async (userId) => {
    const [
        userProfile,
        recentFoodEntries,
        mealSchedules,
        recipeHistory,
        savedRecipes,
        groceries,
        mealPlannerPrefs
    ] = await Promise.all([
        fetchUserProfile(userId),
        fetchRecentFoodEntries(userId, 7),
        fetchMealSchedule(userId, 7),
        fetchRecipeHistory(userId, 30),
        fetchSavedRecipes(userId),
        fetchUserGroceries(userId, 14),
        fetchMealPlannerPreferences(userId)
    ]);

    const nutritionDashboard = aggregateNutritionDashboard(recentFoodEntries);

    if (!userProfile) {
        return '';
    }

    let context = `\n────────────────────────\nUSER PROFILE DATA\n────────────────────────\n`;

    const displayName = userProfile.prefferedName || userProfile.name || 'User';
    context += `Name: ${displayName}\n`;

    if (userProfile.gender) {
        context += `Gender: ${userProfile.gender}\n`;
    }

    if (userProfile.birthdate) {
        const age = calculateAge(userProfile.birthdate);
        if (age) context += `Age: ${age} years\n`;
    }

    if (userProfile.height) {
        context += `Height: ${userProfile.height}\n`;
    }

    if (userProfile.weight) {
        context += `Weight: ${userProfile.weight}\n`;
    }

    if (userProfile.dailyActivityLevel) {
        context += `Activity Level: ${userProfile.dailyActivityLevel}\n`;
    }

    if (userProfile.wellnessGoals || userProfile.dietaryPreference || userProfile.nutritionStyle) {
        context += `\nNutrition Preferences:\n`;
        if (userProfile.wellnessGoals) context += `• Goals: ${userProfile.wellnessGoals}\n`;
        if (userProfile.dietaryPreference) context += `• Dietary Preference: ${userProfile.dietaryPreference}\n`;
        if (userProfile.nutritionStyle) context += `• Nutrition Style: ${userProfile.nutritionStyle}\n`;
    }

    if (userProfile.allergiesAndSensitivities || userProfile.wellnessConsiderations) {
        context += `\nHealth Considerations:\n`;
        if (userProfile.allergiesAndSensitivities) context += `• Allergies/Sensitivities: ${userProfile.allergiesAndSensitivities}\n`;
        if (userProfile.wellnessConsiderations) context += `• Wellness Considerations: ${userProfile.wellnessConsiderations}\n`;
    }

    if (mealPlannerPrefs) {
        context += `\nMeal Planning Preferences:\n`;
        if (mealPlannerPrefs.food_restrictions) context += `• Food Restrictions: ${mealPlannerPrefs.food_restrictions}\n`;
        if (mealPlannerPrefs.food_allergies) context += `• Food Allergies: ${mealPlannerPrefs.food_allergies}\n`;
        if (mealPlannerPrefs.food_preferences) context += `• Food Preferences: ${mealPlannerPrefs.food_preferences}\n`;
        if (mealPlannerPrefs.nutrition_goals) context += `• Nutrition Goals: ${mealPlannerPrefs.nutrition_goals}\n`;
    }

    context += `\n────────────────────────\nNUTRITION DASHBOARD (Last 7 Days)\n────────────────────────\n`;

    if (nutritionDashboard.totalEntries > 0) {
        context += `\nWeekly Summary:\n`;
        context += `• Total Food Entries: ${nutritionDashboard.totalEntries}\n`;
        context += `• Days Logged: ${nutritionDashboard.daysLogged}\n`;

        context += `\nWeekly Totals:\n`;
        context += `• Calories: ${nutritionDashboard.weeklyTotals.calories} kcal\n`;
        context += `• Protein: ${nutritionDashboard.weeklyTotals.protein}g\n`;
        context += `• Carbohydrates: ${nutritionDashboard.weeklyTotals.carbohydrates}g\n`;
        context += `• Fat: ${nutritionDashboard.weeklyTotals.fat}g\n`;
        context += `• Fiber: ${nutritionDashboard.weeklyTotals.fiber}g\n`;
        context += `• Water Intake: ${nutritionDashboard.weeklyTotals.water_intake}ml\n`;

        context += `\nDaily Averages:\n`;
        context += `• Calories: ${nutritionDashboard.dailyAverages.calories} kcal/day\n`;
        context += `• Protein: ${nutritionDashboard.dailyAverages.protein}g/day\n`;
        context += `• Carbohydrates: ${nutritionDashboard.dailyAverages.carbohydrates}g/day\n`;
        context += `• Fat: ${nutritionDashboard.dailyAverages.fat}g/day\n`;

        context += `\nMacro Distribution:\n`;
        context += `• Carbs: ${nutritionDashboard.macroPercentages.carbohydrates}%\n`;
        context += `• Protein: ${nutritionDashboard.macroPercentages.protein}%\n`;
        context += `• Fat: ${nutritionDashboard.macroPercentages.fat}%\n`;

        context += `\nRecent Daily Breakdown:\n`;
        nutritionDashboard.dailyData.slice(0, 3).forEach(day => {
            context += `\n${day.date}:\n`;
            context += `  Meals: ${day.meals.map(m => `${m.food_type}: ${m.food_name}`).join(', ')}\n`;
            context += `  Calories: ${Math.round(day.calories)} | Protein: ${Math.round(day.protein)}g | Carbs: ${Math.round(day.carbohydrates)}g | Fat: ${Math.round(day.fat)}g\n`;
        });
    } else {
        context += `\nNo food entries logged in the past 7 days.\n`;
    }

    context += `\n────────────────────────\nMEAL PLAN/SCHEDULE\n────────────────────────\n`;

    if (mealSchedules.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const upcomingMeals = mealSchedules.filter(m => m.date >= today);
        const pastMeals = mealSchedules.filter(m => m.date < today);

        if (upcomingMeals.length > 0) {
            context += `\nUpcoming Planned Meals:\n`;
            const groupedUpcoming = {};
            upcomingMeals.slice(0, 14).forEach(meal => {
                if (!groupedUpcoming[meal.date]) {
                    groupedUpcoming[meal.date] = [];
                }
                groupedUpcoming[meal.date].push(meal);
            });

            Object.keys(groupedUpcoming).slice(0, 3).forEach(date => {
                context += `\n${date}:\n`;
                groupedUpcoming[date].forEach(meal => {
                    const dishName = meal.dish_name || meal.description || 'Meal';
                    context += `  • ${meal.meal}: ${dishName}${meal.time ? ` at ${meal.time}` : ''}\n`;

                    if (meal.nutrition_facts) {
                        try {
                            const facts = typeof meal.nutrition_facts === 'string'
                                ? JSON.parse(meal.nutrition_facts)
                                : meal.nutrition_facts;
                            if (facts.calories) {
                                context += `    (${facts.calories} kcal`;
                                if (facts.protein) context += `, ${facts.protein}g protein`;
                                context += `)\n`;
                            }
                        } catch (e) { }
                    }
                });
            });
        }

        if (pastMeals.length > 0) {
            context += `\nRecent Meal Plan Adherence:\n`;
            context += `• Planned meals in past 7 days: ${pastMeals.length}\n`;
            const favoriteMeals = pastMeals.filter(m => m.is_favorite);
            if (favoriteMeals.length > 0) {
                context += `• Favorite meals: ${favoriteMeals.map(m => m.dish_name || m.description).slice(0, 3).join(', ')}\n`;
            }
        }
    } else {
        context += `\nNo meal plans scheduled.\n`;
    }

    context += `\n────────────────────────\nRECIPE HISTORY (Last 30 Days)\n────────────────────────\n`;

    if (recipeHistory.length > 0) {
        context += `\nTotal Recipes Generated: ${recipeHistory.length}\n`;

        const favoriteRecipes = recipeHistory.filter(r => r.is_favorite);
        if (favoriteRecipes.length > 0) {
            context += `\nFavorite Recipes:\n`;
            favoriteRecipes.slice(0, 5).forEach(recipe => {
                context += `• ${recipe.dish_name} (${recipe.recipe_type})`;
                if (recipe.nutrition_facts) {
                    try {
                        const facts = typeof recipe.nutrition_facts === 'string'
                            ? JSON.parse(recipe.nutrition_facts)
                            : recipe.nutrition_facts;
                        if (facts.calories) context += ` - ${facts.calories} kcal`;
                    } catch (e) { }
                }
                context += `\n`;
            });
        }

        const recipeTypes = {};
        recipeHistory.forEach(r => {
            recipeTypes[r.recipe_type] = (recipeTypes[r.recipe_type] || 0) + 1;
        });
        context += `\nRecipe Types Generated:\n`;
        Object.entries(recipeTypes).forEach(([type, count]) => {
            context += `• ${type}: ${count} recipes\n`;
        });

        context += `\nRecent Recipes:\n`;
        recipeHistory.slice(0, 5).forEach(recipe => {
            context += `• ${recipe.date}: ${recipe.dish_name} (${recipe.recipe_type})`;
            if (recipe.prep_time_minutes) context += ` - ${recipe.prep_time_minutes + (recipe.cook_time_minutes || 0)} min total`;
            context += `\n`;
        });
    } else {
        context += `\nNo recipes generated in the past 30 days.\n`;
    }

    context += `\n────────────────────────\nSAVED RECIPES\n────────────────────────\n`;

    if (savedRecipes.length > 0) {
        context += `\nTotal Saved Recipes: ${savedRecipes.length}\n`;

        const preferredRecipes = savedRecipes.filter(r => r.is_preferred);
        if (preferredRecipes.length > 0) {
            context += `\nPreferred Recipes:\n`;
            preferredRecipes.slice(0, 5).forEach(recipe => {
                context += `• ${recipe.dish_name}`;
                if (recipe.dietary_preferences) context += ` (${recipe.dietary_preferences})`;
                if (recipe.nutrition_facts) {
                    try {
                        const facts = typeof recipe.nutrition_facts === 'string'
                            ? JSON.parse(recipe.nutrition_facts)
                            : recipe.nutrition_facts;
                        if (facts.calories) context += ` - ${facts.calories} kcal`;
                    } catch (e) { }
                }
                context += `\n`;
            });
        }

        const otherSaved = savedRecipes.filter(r => !r.is_preferred);
        if (otherSaved.length > 0) {
            context += `\nOther Saved Recipes:\n`;
            otherSaved.slice(0, 5).forEach(recipe => {
                context += `• ${recipe.dish_name}`;
                if (recipe.dietary_preferences) context += ` (${recipe.dietary_preferences})`;
                context += `\n`;
            });
        }
    } else {
        context += `\nNo saved recipes.\n`;
    }

    context += `\n────────────────────────\nGROCERY LIST (Last 14 Days)\n────────────────────────\n`;

    if (groceries.length > 0) {
        context += `\nActive Grocery Items: ${groceries.length}\n`;

        const groceryByDate = {};
        groceries.forEach(g => {
            const date = g.grocery_date || 'Unscheduled';
            if (!groceryByDate[date]) {
                groceryByDate[date] = [];
            }
            groceryByDate[date].push(g);
        });

        context += `\nRecent Grocery Items:\n`;
        const recentDates = Object.keys(groceryByDate).slice(0, 3);
        recentDates.forEach(date => {
            context += `\n${date}:\n`;
            groceryByDate[date].slice(0, 8).forEach(item => {
                context += `  • ${item.item}${item.quantity ? ` (${item.quantity})` : ''}\n`;
            });
            if (groceryByDate[date].length > 8) {
                context += `  ... and ${groceryByDate[date].length - 8} more items\n`;
            }
        });

        const itemCounts = {};
        groceries.forEach(g => {
            const itemName = g.item.toLowerCase();
            itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
        });
        const frequentItems = Object.entries(itemCounts)
            .filter(([, count]) => count > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (frequentItems.length > 0) {
            context += `\nFrequently Purchased Items:\n`;
            frequentItems.forEach(([item, count]) => {
                context += `• ${item} (${count} times)\n`;
            });
        }
    } else {
        context += `\nNo active grocery items.\n`;
    }

    context += `\n────────────────────────\n`;

    return context;
};

const COACH_TYPE = 'nutrition';
const POINTS_CONFIG = {
    coach_conversation: 10,
    coach_message: 5,
    favorite_response: 3,
    share_response: 5,
    feedback_given: 2
};

const awardWellnessPoints = async (userId, actionType, referenceType = null, referenceId = null, description = null) => {
    const points = POINTS_CONFIG[actionType] || 0;
    if (points === 0) return null;

    const pointsRecord = await WellnessPoints.create({
        user_id: userId,
        points: points,
        action_type: actionType,
        action_description: description || `Earned points for ${actionType}`,
        reference_type: referenceType,
        reference_id: referenceId,
        coach_type: COACH_TYPE,
        multiplier: 1.00,
        final_points: points
    });

    let userLevel = await UserLevel.findOne({ where: { user_id: userId } });
    if (!userLevel) {
        userLevel = await UserLevel.create({ user_id: userId });
    }

    await userLevel.update({
        total_points: userLevel.total_points + points,
        nutrition_coach_interactions: userLevel.nutrition_coach_interactions + 1,
        last_activity_date: new Date()
    });

    const newLevel = Math.floor(userLevel.total_points / 100) + 1;
    if (newLevel > userLevel.current_level) {
        await userLevel.update({
            current_level: newLevel,
            points_to_next_level: (newLevel * 100) - userLevel.total_points
        });
    }

    return pointsRecord;
};

const analyzeForCrossCoachReferral = (message) => {
    const fitnessKeywords = ['exercise', 'workout', 'training', 'gym', 'running', 'muscle', 'cardio', 'stretch', 'marathon', 'weight training'];
    const mentalHealthKeywords = ['stress', 'anxiety', 'depression', 'mental', 'therapy', 'mindfulness', 'meditation', 'emotional', 'mood', 'overwhelmed'];

    const lowerMessage = message.toLowerCase();
    const referrals = [];

    const hasFitnessComponent = fitnessKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasMentalHealthComponent = mentalHealthKeywords.some(keyword => lowerMessage.includes(keyword));

    if (hasFitnessComponent) {
        referrals.push({ coach_type: 'fitness', reason: 'Your question has a fitness component' });
    }
    if (hasMentalHealthComponent) {
        referrals.push({ coach_type: 'mental_health', reason: 'Your question has a mental health component' });
    }

    return referrals;
};

const analyzeForToolRecommendation = (message) => {
    const lowerMessage = message.toLowerCase();
    const tools = [];

    if (lowerMessage.includes('recipe') || lowerMessage.includes('cook') || lowerMessage.includes('make a meal') ||
        lowerMessage.includes('dish') || lowerMessage.includes('prepare') || lowerMessage.includes('ingredients')) {
        tools.push({
            tool_name: 'Recipe Generator',
            tool_link: '/app/recipes',
            description: 'Use our Recipe Generator to create customized recipes based on your preferences'
        });
    }

    if (lowerMessage.includes('meal plan') || lowerMessage.includes('weekly plan') || lowerMessage.includes('diet plan') ||
        lowerMessage.includes('daily plan') || lowerMessage.includes('menu') || lowerMessage.includes('eating schedule') ||
        lowerMessage.includes('breakfast lunch dinner') || lowerMessage.includes('plan my meals')) {
        tools.push({
            tool_name: 'Meal Planner',
            tool_link: '/app/nutrition/meal-planner',
            description: 'Use our Meal Planner to create structured meal plans for your goals'
        });
    }

    if (lowerMessage.includes('analyze') || lowerMessage.includes('nutrition info') || lowerMessage.includes('nutritional value') ||
        lowerMessage.includes('how healthy') || lowerMessage.includes('is this healthy') || lowerMessage.includes('scan food') ||
        lowerMessage.includes('what nutrients') || lowerMessage.includes('macro') || lowerMessage.includes('protein content') ||
        lowerMessage.includes('food analysis') || lowerMessage.includes('check my food')) {
        tools.push({
            tool_name: 'Food Analysis',
            tool_link: '/app/nutrition/food-analysis',
            description: 'Use our Food Analysis tool to scan and analyze nutritional content of your food'
        });
    }

    if (lowerMessage.includes('track') || lowerMessage.includes('log food') || lowerMessage.includes('calorie') ||
        lowerMessage.includes('food diary') || lowerMessage.includes('what i ate') || lowerMessage.includes('record meal') ||
        lowerMessage.includes('add food') || lowerMessage.includes('food entry') || lowerMessage.includes('daily intake') ||
        lowerMessage.includes('count calories') || lowerMessage.includes('monitor eating')) {
        tools.push({
            tool_name: 'Food Entry',
            tool_link: '/app/nutrition/food-entry',
            description: 'Use Food Entry to log and track your daily food intake and calories'
        });
    }

    if (lowerMessage.includes('grocery') || lowerMessage.includes('shopping list') || lowerMessage.includes('buy food') ||
        lowerMessage.includes('ingredients list') || lowerMessage.includes('shopping') || lowerMessage.includes('supermarket')) {
        tools.push({
            tool_name: 'Grocery List',
            tool_link: '/app/nutrition/grocery-list',
            description: 'Use our Grocery List feature to organize your shopping'
        });
    }

    if (lowerMessage.includes('progress') || lowerMessage.includes('stats') || lowerMessage.includes('summary') ||
        lowerMessage.includes('dashboard') || lowerMessage.includes('my nutrition') || lowerMessage.includes('weekly report') ||
        lowerMessage.includes('how am i doing')) {
        tools.push({
            tool_name: 'Nutrition Dashboard',
            tool_link: '/app/nutrition/dashboard',
            description: 'View your nutrition dashboard to see your progress and statistics'
        });
    }

    return tools;
};

const askNutritionCoach = async (systemPrompt, userQuestion) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userQuestion }
            ],
            temperature: 0.5
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'OpenAI API error');
    }

    const headers = response.headers;
    const rateLimitInfo = {
        limitTokens: parseInt(headers.get('x-ratelimit-limit-tokens')) || null,
        remainingTokens: parseInt(headers.get('x-ratelimit-remaining-tokens')) || null,
        resetTokens: headers.get('x-ratelimit-reset-tokens') || null,
        limitRequests: parseInt(headers.get('x-ratelimit-limit-requests')) || null,
        remainingRequests: parseInt(headers.get('x-ratelimit-remaining-requests')) || null,
        resetRequests: headers.get('x-ratelimit-reset-requests') || null
    };

    const tokenUsage = data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
    } : null;

    console.log('OpenAI Token Usage:', tokenUsage);
    console.log('OpenAI Rate Limits:', rateLimitInfo);

    return {
        content: data.choices[0].message.content,
        tokenUsage,
        rateLimitInfo
    };
}

const MAX_TOKENS_PER_CONVERSATION = 25000; // 25,000 tokens per conversation (per S11ConversationId)
const MAX_USER_MESSAGES_PER_CONVERSATION = 100; // Maximum user messages per conversation

exports.askNutrition = async (req, res) => {
    try {
        const { question, S11ConversationId, title } = req.body;
        const userId = req.user.id;

        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        let conversation;
        let isNewConversation = false;
        let conversationTokensUsedBefore = 0;

        if (S11ConversationId) {
            const sevenDaysAgo = getSevenDaysAgo();

            conversation = await CoachConversation.findOne({
                where: {
                    id: S11ConversationId,
                    user_id: userId,
                    coach_type: COACH_TYPE,
                    is_deleted: false,
                    created_at: {
                        [Op.gte]: sevenDaysAgo
                    }
                }
            });

            if (!conversation) {
                return res.status(404).json({ error: "Conversation not found or older than 7 days. Please start a new conversation." });
            }

            // Check token limit from database
            conversationTokensUsedBefore = conversation.tokens_used || 0;
            const conversationTokenLimit = conversation.token_limit || MAX_TOKENS_PER_CONVERSATION;

            if (conversationTokensUsedBefore >= conversationTokenLimit) {
                return res.status(400).json({
                    error: "Token limit reached",
                    message: "You have reached the token limit for this conversation. Please start a new chat to continue your conversation with the Nutrition Coach.",
                    suggestion: "Start a new chat by not passing S11ConversationId in your next request.",
                    requiresNewChat: true,
                    S11ConversationId: S11ConversationId,
                    conversationTokenLimit: {
                        used: conversationTokensUsedBefore,
                        max: conversationTokenLimit,
                        remaining: 0,
                        limitReached: true,
                        percentUsed: 100
                    }
                });
            }
        } else {
            const conversationTitle = title
                ? (title.substring(0, 50) + (title.length > 50 ? '...' : ''))
                : (question.substring(0, 50) + (question.length > 50 ? '...' : ''));

            conversation = await CoachConversation.create({
                user_id: userId,
                coach_type: COACH_TYPE,
                title: conversationTitle,
                is_active: true,
                token_limit: MAX_TOKENS_PER_CONVERSATION,
                tokens_used: 0
            });
            isNewConversation = true;

            await awardWellnessPoints(userId, 'coach_conversation', 'conversation', conversation.id, 'Started conversation with Nutrition Coach');
        }

        const userMessage = await CoachMessage.create({
            conversation_id: conversation.id,
            user_id: userId,
            role: 'user',
            content: question,
            coach_type: COACH_TYPE
        });

        const userContext = await buildUserContext(userId);

        const questionType = classifyQuestion(question);

        let aiAnswer;
        let usedOpenAI = false;
        let tokenUsage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        };
        let rateLimitInfo = null;

        if (questionType === 'internal') {
            const internalMatch = findInternalResponse(question);
            aiAnswer = internalMatch.response;
            usedOpenAI = false;

            const promptTokens = countTokens(question);
            const completionTokens = countTokens(aiAnswer);
            tokenUsage = {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens
            };

        } else if (questionType === 'training') {
            const trainingMatch = findTrainingResponse(question);
            if (trainingMatch && trainingMatch.matched) {
                aiAnswer = trainingMatch.response;
                usedOpenAI = false;

                const promptTokens = countTokens(question);
                const completionTokens = countTokens(aiAnswer);
                tokenUsage = {
                    promptTokens,
                    completionTokens,
                    totalTokens: promptTokens + completionTokens
                };
            } else {
                const personalizedPrompt = buildSystemPrompt(questionType, userContext);
                const result = await askNutritionCoach(personalizedPrompt, question);
                aiAnswer = result.content;
                if (result.tokenUsage) {
                    tokenUsage = result.tokenUsage;
                }
                rateLimitInfo = result.rateLimitInfo;
                usedOpenAI = true;
            }

        } else {
            const personalizedPrompt = buildSystemPrompt(questionType, userContext);
            const result = await askNutritionCoach(personalizedPrompt, question);
            aiAnswer = result.content;
            if (result.tokenUsage) {
                tokenUsage = result.tokenUsage;
            }
            rateLimitInfo = result.rateLimitInfo;
            usedOpenAI = true;
        }

        const toolRecommendations = analyzeForToolRecommendation(question);
        const coachReferrals = analyzeForCrossCoachReferral(question);

        const assistantMessage = await CoachMessage.create({
            conversation_id: conversation.id,
            user_id: userId,
            role: 'nutritionCoach',
            content: aiAnswer,
            coach_type: COACH_TYPE,
            has_tool_recommendation: toolRecommendations.length > 0,
            tool_recommendation: toolRecommendations.length > 0 ? toolRecommendations : null,
            has_coach_referral: coachReferrals.length > 0,
            referred_coaches: coachReferrals.length > 0 ? coachReferrals : null
        });

        await awardWellnessPoints(userId, 'coach_message', 'message', assistantMessage.id, 'Sent message to Nutrition Coach');

        // Calculate tokens used in this request
        const tokensUsedThisRequest = tokenUsage ? tokenUsage.totalTokens : 0;

        // Update tokens_used in database
        const newTokensUsed = conversationTokensUsedBefore + tokensUsedThisRequest;
        const conversationTokenLimit = conversation.token_limit || MAX_TOKENS_PER_CONVERSATION;

        await conversation.update({
            updated_at: new Date(),
            tokens_used: newTokensUsed
        });

        res.status(200).json({
            coach: "Nutrition Coach",
            S11ConversationId: conversation.id,
            conversationTitle: conversation.title,
            S11UserMessageId: userMessage.id,
            S11AssistantMessageId: assistantMessage.id,
            isNewConversation: isNewConversation,
            questionType: questionType,
            usedOpenAI: usedOpenAI,
            tokenUsage: tokenUsage,
            rateLimitInfo: rateLimitInfo,
            answer: aiAnswer,
            appRecommendation: toolRecommendations.length > 0
                ? toolRecommendations.map(t => ({
                    tool: t.tool_name,
                    navigation: t.tool_link,
                    description: t.description
                }))
                : null,
            coachReferrals: coachReferrals.length > 0 ? coachReferrals : null,
            earnedWP: isNewConversation ? 15 : 5,
            created_at: assistantMessage.created_at,
            conversationTokenLimit: (() => {
                const percentUsed = Math.round((newTokensUsed / conversationTokenLimit) * 100);
                const limitReached = newTokensUsed >= conversationTokenLimit;
                const approachingLimit = percentUsed >= 80 && !limitReached;

                let message;
                if (limitReached) {
                    message = "You have reached the token limit for this conversation. Please start a new chat to continue.";
                } else if (approachingLimit) {
                    message = `Warning: You have used ${percentUsed}% of your token limit. Consider starting a new chat soon.`;
                } else {
                    message = `You have ${Math.max(0, conversationTokenLimit - newTokensUsed).toLocaleString()} tokens remaining in this conversation.`;
                }

                return {
                    tokensBefore: conversationTokensUsedBefore,
                    tokensAfter: newTokensUsed,
                    tokensUsedThisRequest: tokensUsedThisRequest,
                    used: newTokensUsed,
                    max: conversationTokenLimit,
                    remaining: Math.max(0, conversationTokenLimit - newTokensUsed),
                    percentUsed: percentUsed,
                    limitReached: limitReached,
                    approachingLimit: approachingLimit,
                    message: message,
                    suggestion: limitReached ? "Start a new chat to continue your conversation." : null
                };
            })(),
            openAILimits: (rateLimitInfo && rateLimitInfo.limitTokens) ? {
                tokens: {
                    used: rateLimitInfo.limitTokens - rateLimitInfo.remainingTokens,
                    max: rateLimitInfo.limitTokens,
                    remaining: rateLimitInfo.remainingTokens,
                    resetIn: rateLimitInfo.resetTokens
                },
                requests: {
                    used: rateLimitInfo.limitRequests - rateLimitInfo.remainingRequests,
                    max: rateLimitInfo.limitRequests,
                    remaining: rateLimitInfo.remainingRequests,
                    resetIn: rateLimitInfo.resetRequests
                }
            } : null
        });
    } catch (err) {
        res.status(500).json({ error: "Nutrition Coach failed to respond", details: err.message });
    }
};

exports.fetchLastSevenDaysConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const { include_deleted, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const sevenDaysAgo = getSevenDaysAgo();

        const conversationWhere = {
            user_id: userId,
            coach_type: COACH_TYPE,
            created_at: { [Op.gte]: sevenDaysAgo }
        };

        if (!include_deleted || include_deleted !== 'true') {
            conversationWhere.is_deleted = false;
        }

        const conversations = await CoachConversation.findAll({
            where: conversationWhere,
            attributes: ['id'],
            raw: true
        });

        const conversationIds = conversations.map(c => c.id);

        if (conversationIds.length === 0) {
            return responseSuccess(res, 200, 'No conversations found', {
                user_id: userId,
                qna_pairs: [],
                pagination: {
                    current_page: pageNum,
                    per_page: limitNum,
                    total_count: 0,
                    total_pages: 0,
                    has_next: false,
                    has_prev: false
                },
                filter: {
                    from_date: sevenDaysAgo.toISOString(),
                    to_date: new Date().toISOString(),
                    days: 7
                }
            });
        }

        const totalQuestions = await CoachMessage.count({
            where: {
                conversation_id: { [Op.in]: conversationIds },
                role: 'user',
                is_deleted: false
            }
        });

        const userMessages = await CoachMessage.findAll({
            where: {
                conversation_id: { [Op.in]: conversationIds },
                role: 'user',
                is_deleted: false
            },
            order: [['created_at', 'DESC']],
            limit: limitNum,
            offset: offset,
            attributes: ['id', 'conversation_id', 'content', 'created_at']
        });

        const qnaPairs = await Promise.all(userMessages.map(async (question) => {
            const answer = await CoachMessage.findOne({
                where: {
                    conversation_id: question.conversation_id,
                    role: 'nutritionCoach',
                    is_deleted: false,
                    created_at: { [Op.gt]: question.created_at }
                },
                order: [['created_at', 'ASC']],
                attributes: ['id', 'content', 'has_tool_recommendation', 'tool_recommendation', 'has_coach_referral', 'referred_coaches', 'created_at']
            });

            const conversation = await CoachConversation.findByPk(question.conversation_id, {
                attributes: ['id', 'title', 'created_at']
            });

            const questionFavorite = await FavoriteMessage.findOne({
                where: {
                    user_id: userId,
                    message_id: question.id,
                    conversation_id: question.conversation_id
                }
            });

            let answerFavorite = null;
            if (answer) {
                answerFavorite = await FavoriteMessage.findOne({
                    where: {
                        user_id: userId,
                        message_id: answer.id,
                        conversation_id: question.conversation_id
                    }
                });
            }

            let toolRecommendation = null;
            let referredCoaches = null;

            if (answer) {
                if (answer.tool_recommendation) {
                    try {
                        toolRecommendation = typeof answer.tool_recommendation === 'string'
                            ? JSON.parse(answer.tool_recommendation)
                            : answer.tool_recommendation;
                    } catch (e) { }
                }

                if (answer.referred_coaches) {
                    try {
                        referredCoaches = typeof answer.referred_coaches === 'string'
                            ? JSON.parse(answer.referred_coaches)
                            : answer.referred_coaches;
                    } catch (e) { }
                }
            }

            return {
                S11ConversationId: question.conversation_id,
                conversation_title: conversation?.title || null,
                conversation_date: conversation?.created_at || null,
                question: {
                    S11MessageId: question.id,
                    content: question.content,
                    is_favorite: !!questionFavorite,
                    favorite_id: questionFavorite?.id || null,
                    created_at: question.created_at
                },
                answer: answer ? {
                    S11MessageId: answer.id,
                    content: answer.content,
                    is_favorite: !!answerFavorite,
                    favorite_id: answerFavorite?.id || null,
                    has_tool_recommendation: answer.has_tool_recommendation,
                    tool_recommendation: toolRecommendation,
                    has_coach_referral: answer.has_coach_referral,
                    referred_coaches: referredCoaches,
                    created_at: answer.created_at
                } : null
            };
        }));

        const totalPages = Math.ceil(totalQuestions / limitNum);

        return responseSuccess(res, 200, 'Q&A pairs fetched successfully', {
            user_id: userId,
            qna_pairs: qnaPairs,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_count: totalQuestions,
                total_pages: totalPages,
                has_next: pageNum < totalPages,
                has_prev: pageNum > 1
            },
            filter: {
                from_date: sevenDaysAgo.toISOString(),
                to_date: new Date().toISOString(),
                days: 7
            }
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to fetch conversations', error.message);
    }
};

exports.fetchConversationById = async (req, res) => {
    try {
        const { S11ConversationId, page = 1, limit = 20 } = req.body;
        const userId = req.user.id;

        if (!S11ConversationId) {
            return responseError(res, 400, 'S11ConversationId is required');
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const sevenDaysAgo = getSevenDaysAgo();

        const conversation = await CoachConversation.findOne({
            where: {
                id: S11ConversationId,
                user_id: userId,
                coach_type: COACH_TYPE,
                is_deleted: false,
                created_at: {
                    [Op.gte]: sevenDaysAgo
                }
            }
        });

        if (!conversation) {
            return responseError(res, 404, 'Conversation not found or older than 7 days');
        }

        const totalCount = await CoachMessage.count({
            where: {
                conversation_id: S11ConversationId,
                is_deleted: false
            }
        });

        const messages = await CoachMessage.findAll({
            where: {
                conversation_id: S11ConversationId,
                is_deleted: false
            },
            order: [['created_at', 'ASC']],
            limit: limitNum,
            offset: offset,
            include: [{
                model: FavoriteMessage,
                as: 'favorites',
                where: { user_id: userId },
                required: false
            }]
        });

        const formattedMessages = messages.map(msg => {
            let toolRecommendation = msg.tool_recommendation;
            if (typeof toolRecommendation === 'string') {
                try {
                    toolRecommendation = JSON.parse(toolRecommendation);
                } catch (e) {
                    toolRecommendation = null;
                }
            }

            let referredCoaches = msg.referred_coaches;
            if (typeof referredCoaches === 'string') {
                try {
                    referredCoaches = JSON.parse(referredCoaches);
                } catch (e) {
                    referredCoaches = null;
                }
            }

            return {
                S11MessageId: msg.id,
                role: msg.role,
                content: msg.content,
                coach_type: msg.coach_type,
                has_tool_recommendation: msg.has_tool_recommendation,
                tool_recommendation: toolRecommendation,
                has_coach_referral: msg.has_coach_referral,
                referred_coaches: referredCoaches,
                is_favorited: msg.favorites && msg.favorites.length > 0,
                is_edited: msg.is_edited,
                includes_disclaimer: msg.includes_disclaimer,
                created_at: msg.created_at
            };
        });

        const totalPages = Math.ceil(totalCount / limitNum);

        return responseSuccess(res, 200, 'Conversation fetched successfully', {
            S11ConversationId: conversation.id,
            title: conversation.title,
            S11CoachType: conversation.coach_type,
            S11Messages: formattedMessages,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_count: totalCount,
                total_pages: totalPages,
                has_next: pageNum < totalPages,
                has_prev: pageNum > 1
            }
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to fetch conversation', error.message);
    }
};

exports.addToFavorites = async (req, res) => {
    try {
        const { S11MessageId, S11ConversationId } = req.body;
        const userId = req.user.id;

        if (!S11MessageId || !S11ConversationId) {
            return responseError(res, 400, 'S11MessageId and S11ConversationId are required');
        }

        const message = await CoachMessage.findOne({
            where: { id: S11MessageId, conversation_id: S11ConversationId },
            include: [{
                model: CoachConversation,
                as: 'conversation',
                where: { user_id: userId }
            }]
        });

        if (!message) {
            return responseError(res, 404, 'Message not found');
        }

        const existingFavorite = await FavoriteMessage.findOne({
            where: { user_id: userId, message_id: S11MessageId, conversation_id: S11ConversationId }
        });

        if (existingFavorite) {
            return responseError(res, 400, 'Message already in favorites');
        }

        const favorite = await FavoriteMessage.create({
            user_id: userId,
            message_id: S11MessageId,
            conversation_id: S11ConversationId,
            coach_type: COACH_TYPE,
        });

        return responseSuccess(res, 201, 'Added to favorites successfully', {
            S11FavoriteId: favorite.id,
            S11MessageId: S11MessageId,
            S11ConversationId: S11ConversationId
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to add to favorites', error.message);
    }
};

exports.removeFromFavorites = async (req, res) => {
    try {
        const { S11MessageId, S11ConversationId } = req.body;
        const userId = req.user.id;

        if (!S11MessageId || !S11ConversationId) {
            return responseError(res, 400, 'S11MessageId and S11ConversationId are required');
        }

        const favorite = await FavoriteMessage.findOne({
            where: { user_id: userId, message_id: S11MessageId, conversation_id: S11ConversationId }
        });

        if (!favorite) {
            return responseError(res, 404, 'Favorite not found');
        }

        await favorite.destroy();

        return responseSuccess(res, 200, 'Removed from favorites successfully', {
            success: true,
            S11MessageId: S11MessageId,
            S11ConversationId: S11ConversationId
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to remove from favorites', error.message);
    }
};

exports.getFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const whereClause = {
            user_id: userId,
            coach_type: COACH_TYPE
        };

        const totalCount = await FavoriteMessage.count({ where: whereClause });

        const favorites = await FavoriteMessage.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: limitNum,
            offset: offset,
            include: [{
                model: CoachMessage,
                as: 'message',
                attributes: ['id', 'content', 'role', 'created_at']
            }]
        });

        const formattedFavorites = favorites.map(fav => (
            {
                S11FavoriteId: fav.id,
                S11MessageId: fav.message_id,
                S11ConversationId: fav.conversation_id,
                message_content: fav.message?.content,
                message_role: fav.message?.role,
                created_at: fav.created_at
            }));

        const totalPages = Math.ceil(totalCount / limitNum);

        return responseSuccess(res, 200, 'Favorites fetched successfully', {
            S11Favorites: formattedFavorites,
            pagination: {
                current_page: pageNum,
                per_page: limitNum,
                total_count: totalCount,
                total_pages: totalPages,
                has_next: pageNum < totalPages,
                has_prev: pageNum > 1
            }
        });
    } catch (error) {
        return responseError(res, 500, 'Failed to fetch favorites', error.message);
    }
};

exports.getChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { S11ConversationId, page = 1, limit = 20 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        if (S11ConversationId) {
            const conversation = await CoachConversation.findOne({
                where: {
                    id: S11ConversationId,
                    user_id: userId,
                    coach_type: COACH_TYPE,
                    is_deleted: false
                }
            });

            if (!conversation) {
                return responseError(res, 404, 'Conversation not found');
            }

            const messages = await CoachMessage.findAll({
                where: {
                    conversation_id: conversation.id,
                    is_deleted: false
                },
                order: [['created_at', 'ASC']],
                include: [{
                    model: FavoriteMessage,
                    as: 'favorites',
                    where: { user_id: userId },
                    required: false
                }]
            });

            const userMessageCount = messages.filter(m => m.role === 'user').length;

            const formattedMessages = messages.map(msg => {
                let toolRecommendation = msg.tool_recommendation;
                if (typeof toolRecommendation === 'string') {
                    try {
                        toolRecommendation = JSON.parse(toolRecommendation);
                    } catch (e) {
                        toolRecommendation = null;
                    }
                }

                let referredCoaches = msg.referred_coaches;
                if (typeof referredCoaches === 'string') {
                    try {
                        referredCoaches = JSON.parse(referredCoaches);
                    } catch (e) {
                        referredCoaches = null;
                    }
                }

                return {
                    S11MessageId: msg.id,
                    role: msg.role,
                    content: msg.content,
                    coach_type: msg.coach_type,
                    has_tool_recommendation: msg.has_tool_recommendation,
                    tool_recommendation: toolRecommendation,
                    has_coach_referral: msg.has_coach_referral,
                    referred_coaches: referredCoaches,
                    is_favorited: msg.favorites && msg.favorites.length > 0,
                    created_at: msg.created_at
                };
            });

            let displayTitle = conversation.title;
            if (!displayTitle && messages.length > 0) {
                const firstUserMessage = messages.find(m => m.role === 'user');
                if (firstUserMessage) {
                    displayTitle = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
                }
            }

            const tokensUsed = conversation.tokens_used || 0;
            const tokenLimit = conversation.token_limit || MAX_TOKENS_PER_CONVERSATION;
            const percentUsed = Math.min(100, Math.round((tokensUsed / tokenLimit) * 100));

            return responseSuccess(res, 200, 'Chat history fetched successfully', {
                conversation: {
                    S11ConversationId: conversation.id,
                    title: displayTitle,
                    coach_type: conversation.coach_type,
                    created_at: conversation.created_at,
                    updated_at: conversation.updated_at,
                },
                messages: formattedMessages,
                totalMessages: messages.length,
                messageLimit: {
                    current: userMessageCount,
                    max: MAX_USER_MESSAGES_PER_CONVERSATION,
                    remaining: MAX_USER_MESSAGES_PER_CONVERSATION - userMessageCount
                },
                tokenUsagePercent: percentUsed
            });
        } else {
            const totalCount = await CoachConversation.count({
                where: {
                    user_id: userId,
                    coach_type: COACH_TYPE,
                    is_deleted: false
                }
            });

            const conversations = await CoachConversation.findAll({
                where: {
                    user_id: userId,
                    coach_type: COACH_TYPE,
                    is_deleted: false
                },
                order: [['updated_at', 'DESC']],
                limit: limitNum,
                offset: offset,
                attributes: ['id', 'title', 'coach_type', 'created_at', 'updated_at', 'tokens_used', 'token_limit']
            });

            if (conversations.length === 0) {
                return responseSuccess(res, 200, 'No conversations found', {
                    chatRooms: [],
                    pagination: {
                        current_page: pageNum,
                        per_page: limitNum,
                        total_count: 0,
                        total_pages: 0,
                        has_next: false,
                        has_prev: false
                    }
                });
            }

            const chatRooms = await Promise.all(conversations.map(async (conv) => {
                let displayTitle = conv.title;

                if (!displayTitle) {
                    const firstUserMessage = await CoachMessage.findOne({
                        where: {
                            conversation_id: conv.id,
                            role: 'user',
                            is_deleted: false
                        },
                        order: [['created_at', 'ASC']],
                        attributes: ['content']
                    });

                    if (firstUserMessage) {
                        displayTitle = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
                    } else {
                        displayTitle = 'Untitled Chat';
                    }
                }

                const messageCount = await CoachMessage.count({
                    where: {
                        conversation_id: conv.id,
                        is_deleted: false
                    }
                });

                const userMessageCount = await CoachMessage.count({
                    where: {
                        conversation_id: conv.id,
                        role: 'user',
                        is_deleted: false
                    }
                });

                const tokensUsed = conv.tokens_used || 0;
                const tokenLimit = conv.token_limit || MAX_TOKENS_PER_CONVERSATION;

                return {
                    S11ConversationId: conv.id,
                    title: displayTitle,
                    coach_type: conv.coach_type,
                    totalMessages: messageCount,
                    messageLimit: {
                        current: userMessageCount,
                        max: MAX_USER_MESSAGES_PER_CONVERSATION,
                        remaining: MAX_USER_MESSAGES_PER_CONVERSATION - userMessageCount
                    },
                    tokenUsage: {
                        used: tokensUsed,
                        max: tokenLimit,
                        remaining: Math.max(0, tokenLimit - tokensUsed),
                        percentUsed: Math.round((tokensUsed / tokenLimit) * 100),
                        limitReached: tokensUsed >= tokenLimit
                    },
                    created_at: conv.created_at,
                    updated_at: conv.updated_at
                };
            }));

            const totalPages = Math.ceil(totalCount / limitNum);

            return responseSuccess(res, 200, 'Chat rooms fetched successfully', {
                chatRooms: chatRooms,
                pagination: {
                    current_page: pageNum,
                    per_page: limitNum,
                    total_count: totalCount,
                    total_pages: totalPages,
                    has_next: pageNum < totalPages,
                    has_prev: pageNum > 1
                }
            });
        }
    } catch (error) {
        return responseError(res, 500, 'Failed to fetch chat history', error.message);
    }
};
