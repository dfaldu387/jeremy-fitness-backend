const { responseSuccess, responseError } = require('../../utils/response');
const { Op, Sequelize } = require('sequelize');
const MealSchedule = require('../../models/userMealSchedule.model');
const Groceries = require('../../models/groceriesMeal.model');
const FoodEntry = require('../../models/foodEntry.model');
const NutritionalInfo = require('../../models/nutritionalInfo.model');
const RecipeHistory = require('../../models/recipeHistory.model');

exports.getNutritionDashboard = async (req, res) => {
    try {
        const userId = Number(req.user?.id);

        if (!userId) {
            return responseError(res, 401, "Unauthorized: User ID not found in token");
        }

        const { date } = req.query;

        const today = date ? new Date(date) : new Date();
        if (isNaN(today.getTime())) {
            return responseError(res, 400, "Invalid date format. Use YYYY-MM-DD");
        }

        const todayStr = today.toISOString().split("T")[0];
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

        const nutrientMapping = {
            calories: ["calorie", "calories", "kcal", "energy"],
            carbohydrates: ["carbohydrate", "carbohydrates", "carbs", "total carbohydrate"],
            fat: ["fat", "total fat"],
            protein: ["protein", "proteins"],
            saturated_fat: ["saturated fat", "saturated"],
            unsaturated_fat: ["unsaturated fat", "unsaturated", "monounsaturated", "polyunsaturated"],
            cholesterol: ["cholesterol"],
            fiber: ["fiber", "dietary fiber", "fibre"],
            sugar: ["sugar", "sugars", "total sugar"],
            sodium: ["sodium"],
            potassium: ["potassium"],
            vitamin_a: ["vitamin a"],
            vitamin_c: ["vitamin c"],
            vitamin_d: ["vitamin d"],
            calcium: ["calcium"],
            iron: ["iron"],
        };

        const foodEntries = await FoodEntry.findAll({
            where: {
                user_id: userId,
                date: { [Op.between]: [sevenDaysAgoStr, todayStr] },
            },
            include: [
                {
                    model: NutritionalInfo,
                    as: "nutritionalInfo",
                    attributes: ["nutrient_name", "amount", "unit", "daily_value_percent"],
                },
            ],
            order: [["date", "ASC"]],
        });

        const dayWiseData = {};
        for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split("T")[0];
            dayWiseData[dateKey] = {
                date: dateKey,
                calories: 0,
                carbohydrates: 0,
                fat: 0,
                protein: 0,
                saturated_fat: 0,
                unsaturated_fat: 0,
                cholesterol: 0,
                fiber: 0,
                sugar: 0,
                water_intake: 0,
            };
        }

        const totalNutrients = {};

        foodEntries.forEach((entry) => {
            const entryDate = entry.date;

            if (dayWiseData[entryDate]) {

                dayWiseData[entryDate].water_intake += parseFloat(entry.water_content_ml || 0);

                if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
                    entry.nutritionalInfo.forEach((nutrient) => {
                        const nutrientNameLower = nutrient.nutrient_name.toLowerCase();
                        const amount = parseFloat(nutrient.amount || 0);

                        Object.keys(nutrientMapping).forEach((field) => {
                            const aliases = nutrientMapping[field];
                            const isMatch = aliases.some((alias) => nutrientNameLower.includes(alias));
                            if (isMatch && dayWiseData[entryDate][field] !== undefined) {
                                dayWiseData[entryDate][field] += amount;
                            }
                        });

                        if (!totalNutrients[nutrient.nutrient_name]) {
                            totalNutrients[nutrient.nutrient_name] = {
                                total_amount: 0,
                                unit: nutrient.unit || "g",
                                daily_value_percent: 0,
                            };
                        }
                        totalNutrients[nutrient.nutrient_name].total_amount += amount;
                        totalNutrients[nutrient.nutrient_name].daily_value_percent += parseFloat(
                            nutrient.daily_value_percent || 0
                        );
                    });
                }
            }
        });

        const caloriesData = [];

        let weeklyTotals = {
            carbohydrates: 0,
            fat: 0,
            protein: 0,
            fiber: 0,
            sugar: 0,
            saturated_fat: 0,
            unsaturated_fat: 0,
            cholesterol: 0,
            water_intake: 0,
        };

        Object.values(dayWiseData).forEach((day) => {
            const dateObj = new Date(day.date);
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
            const formattedDate = `${String(dateObj.getMonth() + 1).padStart(2, "0")}/${String(
                dateObj.getDate()
            ).padStart(2, "0")}`;

            caloriesData.push({
                date: day.date,
                day: dayName,
                formatted_date: formattedDate,
                calories: parseFloat(day.calories.toFixed(2)),
            });

            weeklyTotals.carbohydrates += day.carbohydrates;
            weeklyTotals.fat += day.fat;
            weeklyTotals.protein += day.protein;
            weeklyTotals.fiber += day.fiber;
            weeklyTotals.sugar += day.sugar;
            weeklyTotals.saturated_fat += day.saturated_fat;
            weeklyTotals.unsaturated_fat += day.unsaturated_fat;
            weeklyTotals.cholesterol += day.cholesterol;
            weeklyTotals.water_intake += day.water_intake;
        });

        const prevWeekEnd = new Date(sevenDaysAgo);
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
        const prevWeekStart = new Date(prevWeekEnd);
        prevWeekStart.setDate(prevWeekEnd.getDate() - 6);
        const prevWeekStartStr = prevWeekStart.toISOString().split("T")[0];
        const prevWeekEndStr = prevWeekEnd.toISOString().split("T")[0];

        const prevWeekEntries = await FoodEntry.findAll({
            where: {
                user_id: userId,
                date: { [Op.between]: [prevWeekStartStr, prevWeekEndStr] },
            },
            include: [
                {
                    model: NutritionalInfo,
                    as: "nutritionalInfo",
                    attributes: ["nutrient_name", "amount"],
                },
            ],
        });

        let prevWeekTotals = {
            carbohydrates: 0,
            fat: 0,
            protein: 0,
        };

        prevWeekEntries.forEach((entry) => {
            if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
                entry.nutritionalInfo.forEach((nutrient) => {
                    const nutrientNameLower = nutrient.nutrient_name.toLowerCase();
                    const amount = parseFloat(nutrient.amount || 0);

                    if (nutrientMapping.carbohydrates.some((alias) => nutrientNameLower.includes(alias))) {
                        prevWeekTotals.carbohydrates += amount;
                    }
                    if (nutrientMapping.fat.some((alias) => nutrientNameLower.includes(alias))) {
                        prevWeekTotals.fat += amount;
                    }
                    if (nutrientMapping.protein.some((alias) => nutrientNameLower.includes(alias))) {
                        prevWeekTotals.protein += amount;
                    }
                });
            }
        });

        const calcPercentChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return parseFloat((((current - previous) / previous) * 100).toFixed(1));
        };

        const totalMacroGrams = weeklyTotals.carbohydrates + weeklyTotals.fat + weeklyTotals.protein;
        const carbsPercent = totalMacroGrams > 0 ? (weeklyTotals.carbohydrates / totalMacroGrams) * 100 : 0;
        const fatPercent = totalMacroGrams > 0 ? (weeklyTotals.fat / totalMacroGrams) * 100 : 0;
        const proteinPercent = totalMacroGrams > 0 ? (weeklyTotals.protein / totalMacroGrams) * 100 : 0;

        const macronutrientsData = {
            carbs: {
                daily_avg: parseFloat((weeklyTotals.carbohydrates / 7).toFixed(2)),
                percentage: parseFloat(carbsPercent.toFixed(0)),
                weekly_total: parseFloat(weeklyTotals.carbohydrates.toFixed(1)),
                change_percent: calcPercentChange(weeklyTotals.carbohydrates, prevWeekTotals.carbohydrates),
                unit: "g",
            },
            fat: {
                daily_avg: parseFloat((weeklyTotals.fat / 7).toFixed(2)),
                percentage: parseFloat(fatPercent.toFixed(0)),
                weekly_total: parseFloat(weeklyTotals.fat.toFixed(1)),
                change_percent: calcPercentChange(weeklyTotals.fat, prevWeekTotals.fat),
                unit: "g",
            },
            protein: {
                daily_avg: parseFloat((weeklyTotals.protein / 7).toFixed(2)),
                percentage: parseFloat(proteinPercent.toFixed(0)),
                weekly_total: parseFloat(weeklyTotals.protein.toFixed(1)),
                change_percent: calcPercentChange(weeklyTotals.protein, prevWeekTotals.protein),
                unit: "g",
            },
            other: {
                fiber: {
                    daily_avg: parseFloat((weeklyTotals.fiber / 7).toFixed(2)),
                    weekly_total: parseFloat(weeklyTotals.fiber.toFixed(1)),
                    unit: "g",
                },
                sugar: {
                    daily_avg: parseFloat((weeklyTotals.sugar / 7).toFixed(2)),
                    weekly_total: parseFloat(weeklyTotals.sugar.toFixed(1)),
                    unit: "g",
                },
                saturated_fat: {
                    daily_avg: parseFloat((weeklyTotals.saturated_fat / 7).toFixed(2)),
                    weekly_total: parseFloat(weeklyTotals.saturated_fat.toFixed(1)),
                    unit: "g",
                },
                unsaturated_fat: {
                    daily_avg: parseFloat((weeklyTotals.unsaturated_fat / 7).toFixed(2)),
                    weekly_total: parseFloat(weeklyTotals.unsaturated_fat.toFixed(1)),
                    unit: "g",
                },
                cholesterol: {
                    daily_avg: parseFloat((weeklyTotals.cholesterol / 7).toFixed(2)),
                    weekly_total: parseFloat(weeklyTotals.cholesterol.toFixed(1)),
                    unit: "mg",
                },
                water_intake: {
                    daily_avg: parseFloat((weeklyTotals.water_intake / 7).toFixed(2)),
                    weekly_total: parseFloat(weeklyTotals.water_intake.toFixed(1)),
                    unit: "ml",
                },
            },
        };

        const nutrientDetails = {};
        Object.keys(totalNutrients).forEach((key) => {
            nutrientDetails[key] = {
                total_amount: parseFloat(totalNutrients[key].total_amount.toFixed(2)),
                unit: totalNutrients[key].unit,
                avg_daily_value_percent: parseFloat(
                    (totalNutrients[key].daily_value_percent / 7).toFixed(2)
                ),
            };
        });

        const recipes = await RecipeHistory.findAll({
            where: {
                user_id: userId,
                date: { [Op.between]: [sevenDaysAgoStr, todayStr] },
            },
            order: [["created_date", "DESC"]],
        });

        const recipeBook = recipes.map((recipe) => ({
            id: recipe.id,
            user_id: recipe.user_id,
            date: recipe.date,
            dish_name: recipe.dish_name,
            description: recipe.description,
            servings: recipe.servings,
            prep_time_minutes: recipe.prep_time_minutes,
            cook_time_minutes: recipe.cook_time_minutes,
            total_time_minutes: recipe.total_time_minutes,
            ingredients: recipe.ingredients,
            cooking_steps_instructions: recipe.cooking_steps_instructions,
            nutrition_facts: recipe.nutrition_facts,
            recipe_type: recipe.recipe_type,
            is_favorite: recipe.is_favorite,
            created_date: recipe.created_date,
            updated_date: recipe.updated_date,
        }));

        const year = today.getFullYear();
        const month = today.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const totalDaysInMonth = monthEnd.getDate();

        const monthStartStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const monthEndStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(totalDaysInMonth).padStart(2, "0")}`;
        const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

        const monthMeals = await MealSchedule.findAll({
            where: {
                user_id: userId,
                date: { [Op.between]: [monthStartStr, monthEndStr] },
            },
            order: [["date", "ASC"], ["time", "ASC"]],
        });

        const mealCalendar = {};

        for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
            const dateObj = new Date(year, month, dayNum);
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
            mealCalendar[dateKey] = {
                date: dateKey,
                day: dayNum,
                day_name: dayName,
                has_meals: false,
                meals: {
                    breakfast: [],
                    lunch: [],
                    dinner: [],
                    snack: [],
                },
            };
        }

        monthMeals.forEach((item) => {
            let dateKey = item.date;
            if (dateKey instanceof Date) {
                dateKey = dateKey.toISOString().split("T")[0];
            } else if (typeof dateKey === "string" && dateKey.includes("T")) {
                dateKey = dateKey.split("T")[0];
            }

            if (!mealCalendar[dateKey]) return;

            mealCalendar[dateKey].has_meals = true;

            let groceriesArray = [];
            let ingredientsArray = [];
            let cookingStepsArray = [];
            let nutritionFactsObj = null;

            if (item.groceries) {
                try {
                    groceriesArray =
                        typeof item.groceries === "string" ? JSON.parse(item.groceries) : item.groceries;
                    if (!Array.isArray(groceriesArray)) {
                        groceriesArray = JSON.parse(groceriesArray);
                    }
                    groceriesArray = groceriesArray.map((g) => ({
                        item: (g.item || "").trim(),
                        quantity: (g.quantity || "").trim(),
                    }));
                } catch (err) {
                    groceriesArray = [];
                }
            }

            if (item.ingredients) {
                try {
                    ingredientsArray =
                        typeof item.ingredients === "string" ? JSON.parse(item.ingredients) : item.ingredients;
                    if (!Array.isArray(ingredientsArray)) {
                        ingredientsArray = JSON.parse(ingredientsArray);
                    }
                } catch (err) {
                    ingredientsArray = [];
                }
            }

            if (item.cooking_steps_instructions) {
                try {
                    let parsed = item.cooking_steps_instructions;
                    if (typeof parsed === "string") parsed = JSON.parse(parsed);
                    if (typeof parsed === "string") parsed = JSON.parse(parsed);
                    cookingStepsArray = Array.isArray(parsed) ? parsed : [];
                } catch (err) {
                    cookingStepsArray = [];
                }
            }

            if (item.nutrition_facts) {
                try {
                    let parsed = item.nutrition_facts;
                    if (typeof parsed === "string") parsed = JSON.parse(parsed);
                    if (typeof parsed === "string") parsed = JSON.parse(parsed);
                    nutritionFactsObj = typeof parsed === "object" ? parsed : null;
                } catch (err) {
                    nutritionFactsObj = null;
                }
            }

            const mealType = item.meal ? item.meal.toLowerCase() : null;

            const mealData = {
                id: item.id,
                user_id: item.user_id,
                recipe_id: item.recipe_id,
                date: item.date,
                time: item.time,
                meal: item.meal,
                example: item.example,
                dish_name: item.dish_name,
                description: item.description,
                servings: item.servings,
                prep_time_minutes: item.prep_time_minutes,
                cook_time_minutes: item.cook_time_minutes,
                total_time_minutes: item.total_time_minutes,
                ingredients: ingredientsArray,
                cooking_steps_instructions: cookingStepsArray,
                nutrition_facts: nutritionFactsObj,
                groceries: groceriesArray,
                is_favorite: item.is_favorite,
                created_date: item.created_date,
                updated_date: item.updated_date,
            };

            if (mealType && mealCalendar[dateKey].meals[mealType]) {
                mealCalendar[dateKey].meals[mealType].push(mealData);
            }
        });

        const mealCalendarArray = Object.values(mealCalendar);
        const daysWithMeals = mealCalendarArray.filter((d) => d.has_meals).length;

        const mealSchedulesForGroceries = await MealSchedule.findAll({
            where: {
                user_id: userId,
                date: { [Op.between]: [sevenDaysAgoStr, todayStr] },
            },
            attributes: ["id", "date", "meal", "dish_name", "example", "recipe_id"],
            order: [["date", "ASC"]],
        });

        const mealScheduleIds = mealSchedulesForGroceries.map((m) => m.id);

        let groceriesList = [];
        if (mealScheduleIds.length > 0) {
            const groceries = await Groceries.findAll({
                where: {
                    user_id: userId,
                    meal_schedule_id: mealScheduleIds,
                    status: "active",
                },
                order: [[Sequelize.col("created_date"), "ASC"]],
            });

            const recipeIds = [
                ...new Set([
                    ...groceries.map((g) => g.recipe_id).filter(Boolean),
                    ...mealSchedulesForGroceries.map((ms) => ms.recipe_id).filter(Boolean),
                ]),
            ];

            let recipeMap = {};
            if (recipeIds.length > 0) {
                const recipesForGroceries = await RecipeHistory.findAll({
                    where: { id: recipeIds },
                    attributes: ["id", "dish_name"],
                });
                recipesForGroceries.forEach((r) => {
                    recipeMap[r.id] = r.dish_name;
                });
            }

            const mealScheduleMap = {};
            mealSchedulesForGroceries.forEach((ms) => {
                mealScheduleMap[ms.id] = {
                    date: ms.date,
                    meal: ms.meal,
                    meal_name: ms.dish_name,
                    example: ms.example,
                    recipe_id: ms.recipe_id,
                };
            });

            groceries.forEach((g) => {
                const mealInfo = mealScheduleMap[g.meal_schedule_id];
                const recipeId = g.recipe_id || mealInfo?.recipe_id;
                groceriesList.push({
                    id: g.id,
                    meal_schedule_id: g.meal_schedule_id,
                    recipe_id: recipeId || null,
                    recipe_name: recipeId ? recipeMap[recipeId] || null : null,
                    item: g.item,
                    quantity: g.quantity,
                    status: g.status,
                    meal_name: mealInfo?.meal_name || null,
                    meal_date: mealInfo?.date || null,
                    meal_type: mealInfo?.meal || null,
                });
            });
        }

        const responseData = {
            user_id: userId,
            date_range: {
                today: todayStr,
                start_date: sevenDaysAgoStr,
                end_date: todayStr,
                total_days: 7,
            },
            calories: {
                description: "Day-wise calorie data for last 7 days",
                total_entries: foodEntries.length,
                data: caloriesData,
            },
            macronutrients: {
                description: "Weekly macronutrient summary with percentage distribution and week-over-week change",
                data: macronutrientsData,
            },
            nutrientDetails: {
                description: "Total nutrient amounts from last 7 days",
                data: nutrientDetails,
            },
            recipeBook: {
                description: "Recipes from last 7 days",
                total: recipeBook.length,
                data: recipeBook,
            },
            mealCalendar: {
                description: "Meal plan for the whole month",
                month: monthName,
                month_start: monthStartStr,
                month_end: monthEndStr,
                today: todayStr,
                total_days: mealCalendarArray.length,
                days_with_meals: daysWithMeals,
                total_meals: monthMeals.length,
                data: mealCalendarArray,
            },
            groceriesList: {
                description: "Groceries from last 7 days",
                total: groceriesList.length,
                data: groceriesList,
            },
        };

        return responseSuccess(res, 200, "Nutrition dashboard data fetched successfully", responseData);
    } catch (error) {
        return responseError(
            res,
            500,
            "Server error while fetching nutrition dashboard",
            error.message
        );
    }
};
