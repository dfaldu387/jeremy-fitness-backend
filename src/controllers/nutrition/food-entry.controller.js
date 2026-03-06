const { responseSuccess, responseError } = require('../../utils/response');
const FoodEntry = require('../../models/foodEntry.model');
const NutritionalInfo = require('../../models/nutritionalInfo.model');
const GroceryItem = require('../../models/groceriesItem.model');
const FoodIngredient = require('../../models/foodIngredient.model');
const { Op } = require('sequelize');
const {
  calculateDailyTotals,
  groupEntriesByDate,
  calculateAverageNutrition,
  getTargetNutrients,
} = require('./helpers/nutrition-calculations');

exports.getFoodEntriesByUserAndDate = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const { startDate, endDate } = req.query;

    if (!userId) {
      return responseError(res, 400, 'userId query parameter is required');
    }
    if (!startDate || !endDate) {
      return responseError(
        res,
        400,
        'startDate and endDate query parameters are required'
      );
    }

    if (isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const foodEntries = await FoodEntry.findAll({
      where: {
        user_id: userId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: NutritionalInfo,
          as: 'nutritionalInfo',
          attributes: [
            'nutrient_name',
            'amount',
            'unit',
            'daily_value_percent',
          ],
        },
        {
          model: GroceryItem,
          as: 'groceryItems',
          attributes: ['name', 'approx_quantity_to_buy', 'category'],
        },
      ],
      order: [['created_date', 'ASC']],
    });

    if (!foodEntries || foodEntries.length === 0) {
      return responseSuccess(
        res,
        200,
        'No food entries found for this user and date range',
        []
      );
    }

    const isSingleDay = startDate === endDate;

    if (isSingleDay) {
      const caloriesByType = {
        breakfast: { total_calories: 0, count: 0 },
        lunch: { total_calories: 0, count: 0 },
        dinner: { total_calories: 0, count: 0 },
        snack: { total_calories: 0, count: 0 },
      };

      let grandTotalCalories = 0;

      const entriesWithCalories = foodEntries.map((entry) => {
        let entryCalories = 0;
        if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
          entry.nutritionalInfo.forEach((nutrient) => {
            const nutrientNameLower = nutrient.nutrient_name.toLowerCase();
            if (nutrientNameLower.includes('calorie')) {
              entryCalories += parseFloat(nutrient.amount || 0);
            }
          });
        }

        const foodType = entry.food_type;
        if (caloriesByType[foodType]) {
          caloriesByType[foodType].total_calories += entryCalories;
          caloriesByType[foodType].count += 1;
        }

        grandTotalCalories += entryCalories;

        return {
          id: entry.id,
          food_name: entry.food_name,
          food_type: entry.food_type,
          food_time: entry.food_time,
          quantity: entry.total_weight_grams,
          water_content_ml: entry.water_content_ml,
          food_image: entry.food_image,
          calories: parseFloat(entryCalories.toFixed(2)),
          created_date: entry.created_date,
          nutritionalInfo: entry.nutritionalInfo,
          groceryItems: entry.groceryItems,
        };
      });

      Object.keys(caloriesByType).forEach((type) => {
        caloriesByType[type].total_calories = parseFloat(
          caloriesByType[type].total_calories.toFixed(2)
        );
      });

      const dayData = {
        date: startDate,
        total_entries: foodEntries.length,
        grand_total_calories: parseFloat(grandTotalCalories.toFixed(2)),
        calories_by_type: {
          breakfast: caloriesByType.breakfast,
          lunch: caloriesByType.lunch,
          dinner: caloriesByType.dinner,
          snack: caloriesByType.snack,
        },
        entries: entriesWithCalories,
        daily_totals: calculateDailyTotals(foodEntries),
      };

      return responseSuccess(
        res,
        200,
        'Food entries for the day fetched successfully',
        dayData
      );
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateRange = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      const dailyBreakdown = groupEntriesByDate(foodEntries);
      const averageData = calculateAverageNutrition(foodEntries, dateRange);

      let totalCalories = 0;
      foodEntries.forEach((entry) => {
        if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
          const calorieInfo = entry.nutritionalInfo.find(
            (n) => n.nutrient_name.toLowerCase() === 'calories'
          );
          if (calorieInfo) {
            totalCalories += calorieInfo.amount || 0;
          }
        }
      });

      return responseSuccess(
        res,
        200,
        'Average nutrition data fetched successfully',
        {
          date_range: {
            start: startDate,
            end: endDate,
            total_days: dateRange,
          },
          total_entries: foodEntries.length,
          total_calories: totalCalories,
          average_entries_per_day: (foodEntries.length / dateRange).toFixed(2),
          daily_breakdown: dailyBreakdown,
          weekly_average: averageData,
        }
      );
    }
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while fetching food entries',
      error.message
    );
  }
};

exports.getAverageNutritionalData = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const { start_date, end_date } = req.query;

    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    if (!start_date || !end_date) {
      return responseError(
        res,
        400,
        'start_date and end_date are required'
      );
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    if (startDate > endDate) {
      return responseError(
        res,
        400,
        'start_date cannot be greater than end_date'
      );
    }

    const totalDays =
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const foodEntries = await FoodEntry.findAll({
      where: {
        user_id: userId,
        date: {
          [Op.between]: [start_date, end_date],
        },
      },
      include: [
        {
          model: NutritionalInfo,
          as: 'nutritionalInfo',
          attributes: [
            'nutrient_name',
            'amount',
            'unit',
            'daily_value_percent',
          ],
        },
      ],
    });

    if (!foodEntries || foodEntries.length === 0) {
      return responseError(
        res,
        404,
        'No food entries found for the specified date range'
      );
    }

    const targetNutrients = getTargetNutrients();
    const dailyData = {};

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const dayData = {
        date: dateKey,
        food_entries_count: 0,
        water_intake_ml: 0,
      };

      Object.keys(targetNutrients).forEach((nutrientKey) => {
        dayData[nutrientKey] = { total: 0, count: 0, unit: 'g', average: 0 };
      });

      dailyData[dateKey] = dayData;
    }

    foodEntries.forEach((entry) => {
      const entryDate = new Date(entry.created_date)
        .toISOString()
        .split('T')[0];

      if (dailyData[entryDate]) {
        dailyData[entryDate].food_entries_count++;

        if (entry.water_content_ml) {
          dailyData[entryDate].water_intake_ml += parseFloat(
            entry.water_content_ml
          );
        }

        if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
          entry.nutritionalInfo.forEach((nutrient) => {
            const nutrientNameLower = nutrient.nutrient_name.toLowerCase();

            Object.keys(targetNutrients).forEach((targetKey) => {
              const aliases = targetNutrients[targetKey];
              const isMatch = aliases.some((alias) =>
                nutrientNameLower.includes(alias)
              );

              if (isMatch && nutrient.amount) {
                dailyData[entryDate][targetKey].total += parseFloat(
                  nutrient.amount
                );
                dailyData[entryDate][targetKey].count += 1;
                if (nutrient.unit) {
                  dailyData[entryDate][targetKey].unit = nutrient.unit;
                }
              }
            });
          });
        }
      }
    });

    Object.keys(dailyData).forEach((dateKey) => {
      dailyData[dateKey].water_intake_ml = parseFloat(
        dailyData[dateKey].water_intake_ml.toFixed(2)
      );

      Object.keys(targetNutrients).forEach((nutrientKey) => {
        const nutrientData = dailyData[dateKey][nutrientKey];
        nutrientData.average =
          nutrientData.count > 0
            ? parseFloat((nutrientData.total / nutrientData.count).toFixed(2))
            : 0;
        nutrientData.total = parseFloat(nutrientData.total.toFixed(2));
      });
    });

    const dailyBreakdown = Object.values(dailyData).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const formattedData = {
      water_intake: [],
    };

    Object.keys(targetNutrients).forEach((nutrientKey) => {
      formattedData[nutrientKey] = [];
    });

    dailyBreakdown.forEach((day) => {
      const dateObj = new Date(day.date);
      const formattedDate = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;

      formattedData.water_intake.push({
        date: formattedDate,
        value: day.water_intake_ml,
      });

      Object.keys(targetNutrients).forEach((nutrientKey) => {
        formattedData[nutrientKey].push({
          date: formattedDate,
          value: day[nutrientKey].total,
        });
      });
    });

    const responseData = {
      user_id: userId,
      date_range: {
        start_date: start_date,
        end_date: end_date,
        total_days: totalDays,
      },
      total_food_entries: foodEntries.length,
      data: formattedData,
    };

    return responseSuccess(
      res,
      200,
      'Daily nutritional data fetched successfully',
      responseData
    );
  } catch (err) {
    return responseError(
      res,
      500,
      'Failed to fetch average nutritional data',
      err.message
    );
  }
};

exports.getDayWiseMealBreakdown = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const { period, date } = req.query;

    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    let startDate, endDate, selectedPeriod;

    if (date) {
      const inputDate = new Date(date);

      if (isNaN(inputDate.getTime())) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }

      const dayOfWeek = inputDate.getDay();
      startDate = new Date(inputDate);
      startDate.setDate(inputDate.getDate() - dayOfWeek);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      selectedPeriod = '7D';
    } else {
      const validPeriods = ['7D', '4W', '3M', '6M', '12M'];
      selectedPeriod = validPeriods.includes(period) ? period : '7D';

      const today = new Date();
      const dayOfWeek = today.getDay();

      switch (selectedPeriod) {
        case '7D':
          endDate = new Date(today);
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 6);
          break;
        case '4W':
          endDate = new Date(today);
          endDate.setDate(today.getDate() + (6 - dayOfWeek));
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - 27);
          break;
        case '3M':
          endDate = new Date(today);
          endDate.setDate(today.getDate() + (6 - dayOfWeek));
          startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
          break;
        case '6M':
          endDate = new Date(today);
          endDate.setDate(today.getDate() + (6 - dayOfWeek));
          startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
          break;
        case '12M':
          endDate = new Date(today);
          endDate.setDate(today.getDate() + (6 - dayOfWeek));
          startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
          break;
      }
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const foodEntries = await FoodEntry.findAll({
      where: {
        user_id: userId,
        date: {
          [Op.between]: [startDateStr, endDateStr],
        },
      },
      include: [
        {
          model: NutritionalInfo,
          as: 'nutritionalInfo',
          attributes: ['nutrient_name', 'amount', 'unit'],
        },
      ],
      order: [['date', 'ASC']],
    });

    const defaultNutrition = {
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
      body_weight: 0,
    };

    const dateMap = {};

    if (selectedPeriod === '7D' || date) {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dateMap[dateKey] = { date: dateKey, ...defaultNutrition };
      }
    } else if (selectedPeriod === '4W') {
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const dateKey = weekStart.toISOString().split('T')[0];
        dateMap[dateKey] = {
          date: dateKey,
          ...defaultNutrition,
          weekNumber: i + 1,
          weekStart: dateKey,
          weekEnd: weekEnd.toISOString().split('T')[0]
        };
      }
    } else {
      const months = selectedPeriod === '3M' ? 3 : selectedPeriod === '6M' ? 6 : 12;
      const startMonth = new Date(startDate);
      for (let i = 0; i < months; i++) {
        const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
        const dateKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`;
        dateMap[dateKey] = { date: dateKey, ...defaultNutrition };
      }
    }

    const nutrientMapping = {
      calories: ['calorie', 'calories', 'kcal', 'energy'],
      // calories: ['calories'],
      carbohydrates: ['carbohydrate', 'carbohydrates', 'carbs', 'total carbohydrate'],
      fat: ['fat', 'total fat'],
      protein: ['protein', 'proteins'],
      saturated_fat: ['saturated fat', 'saturated'],
      unsaturated_fat: ['unsaturated fat', 'unsaturated', 'monounsaturated', 'polyunsaturated'],
      cholesterol: ['cholesterol'],
      fiber: ['fiber', 'dietary fiber', 'fibre'],
      sugar: ['sugar', 'sugars', 'total sugar'],
    };

    foodEntries.forEach((entry) => {
      const entryDate = entry.date || new Date(entry.created_date).toISOString().split('T')[0];

      const entryNutrition = {
        calories: 0,
        carbohydrates: 0,
        fat: 0,
        protein: 0,
        saturated_fat: 0,
        unsaturated_fat: 0,
        cholesterol: 0,
        fiber: 0,
        sugar: 0,
        water_intake: parseFloat(entry.water_content_ml || 0),
      };

      if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
        entry.nutritionalInfo.forEach((nutrient) => {
          const nutrientNameLower = nutrient.nutrient_name.toLowerCase();

          Object.keys(nutrientMapping).forEach((field) => {
            const aliases = nutrientMapping[field];
            const isMatch = aliases.some((alias) => nutrientNameLower.includes(alias));
            if (isMatch) {
              entryNutrition[field] += parseFloat(nutrient.amount || 0);
            }
          });
        });
      }

      let targetKey = null;

      if (selectedPeriod === '7D' || date) {
        if (dateMap[entryDate]) {
          targetKey = entryDate;
        }
      } else if (selectedPeriod === '4W') {
        const entryDateObj = new Date(entryDate);
        const daysSinceStart = Math.floor((entryDateObj - startDate) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(daysSinceStart / 7);
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(startDate.getDate() + (weekIndex * 7));
        const weekKey = weekStartDate.toISOString().split('T')[0];
        if (dateMap[weekKey]) {
          targetKey = weekKey;
        }
      } else {
        const entryDateObj = new Date(entryDate);
        const monthKey = `${entryDateObj.getFullYear()}-${String(entryDateObj.getMonth() + 1).padStart(2, '0')}-01`;
        if (dateMap[monthKey]) {
          targetKey = monthKey;
        }
      }

      if (targetKey && dateMap[targetKey]) {
        dateMap[targetKey].calories += entryNutrition.calories;
        dateMap[targetKey].carbohydrates += entryNutrition.carbohydrates;
        dateMap[targetKey].fat += entryNutrition.fat;
        dateMap[targetKey].protein += entryNutrition.protein;
        dateMap[targetKey].saturated_fat += entryNutrition.saturated_fat;
        dateMap[targetKey].unsaturated_fat += entryNutrition.unsaturated_fat;
        dateMap[targetKey].cholesterol += entryNutrition.cholesterol;
        dateMap[targetKey].fiber += entryNutrition.fiber;
        dateMap[targetKey].sugar += entryNutrition.sugar;
        dateMap[targetKey].water_intake += entryNutrition.water_intake;
      }
    });

    const chartData = Object.values(dateMap).map((item) => {
      const result = {
        date: item.date,
        calories: parseFloat(item.calories.toFixed(2)),
        carbohydrates: parseFloat(item.carbohydrates.toFixed(2)),
        fat: parseFloat(item.fat.toFixed(2)),
        protein: parseFloat(item.protein.toFixed(2)),
        saturated_fat: parseFloat(item.saturated_fat.toFixed(2)),
        unsaturated_fat: parseFloat(item.unsaturated_fat.toFixed(2)),
        cholesterol: parseFloat(item.cholesterol.toFixed(2)),
        fiber: parseFloat(item.fiber.toFixed(2)),
        sugar: parseFloat(item.sugar.toFixed(2)),
        water_intake: parseFloat(item.water_intake.toFixed(2)),
      };
      if (item.weekNumber) {
        result.weekNumber = item.weekNumber;
        result.weekStart = item.weekStart;
        result.weekEnd = item.weekEnd;
      }
      return result;
    });

    const responseData = {
      user_id: userId,
      period: selectedPeriod,
      date_range: {
        start_date: startDateStr,
        end_date: endDateStr,
      },
      total_entries: foodEntries.length,
      chart_data: chartData,
    };

    if (date) {
      responseData.selected_date = date;
      responseData.week_start = startDateStr;
      responseData.week_end = endDateStr;
    }

    return responseSuccess(
      res,
      200,
      'Day-wise meal breakdown fetched successfully',
      responseData
    );
  } catch (err) {
    return responseError(
      res,
      500,
      'Failed to fetch day-wise meal breakdown',
      err.message
    );
  }
};

exports.getNutritionDetailsDashboardByDate = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const { date } = req.query;

    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    if (!date) {
      return responseError(res, 400, 'date query parameter is required');
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const defaultNutrients = {
      'Calories': { total_amount: 0, unit: 'kcal', daily_value_percent: 0, count: 0 },
      'Protein': { total_amount: 0, unit: 'g', daily_value_percent: 0, count: 0 },
      'Carbohydrates': { total_amount: 0, unit: 'g', daily_value_percent: 0, count: 0 },
      'Fat': { total_amount: 0, unit: 'g', daily_value_percent: 0, count: 0 },
      'Saturated Fat': { total_amount: 0, unit: 'g', daily_value_percent: 0, count: 0 },
      'Unsaturated Fat': { total_amount: 0, unit: 'g', daily_value_percent: 0, count: 0 },
      'Cholesterol': { total_amount: 0, unit: 'mg', daily_value_percent: 0, count: 0 },
      'Fiber': { total_amount: 0, unit: 'g', daily_value_percent: 0, count: 0 },
      'Sugar': { total_amount: 0, unit: 'g', daily_value_percent: 0, count: 0 },
      'Sodium': { total_amount: 0, unit: 'mg', daily_value_percent: 0, count: 0 },
      'Potassium': { total_amount: 0, unit: 'mg', daily_value_percent: 0, count: 0 },
      'Vitamin A': { total_amount: 0, unit: 'mcg', daily_value_percent: 0, count: 0 },
      'Vitamin C': { total_amount: 0, unit: 'mg', daily_value_percent: 0, count: 0 },
      'Vitamin D': { total_amount: 0, unit: 'mcg', daily_value_percent: 0, count: 0 },
      'Calcium': { total_amount: 0, unit: 'mg', daily_value_percent: 0, count: 0 },
      'Iron': { total_amount: 0, unit: 'mg', daily_value_percent: 0, count: 0 },
    };

    const foodEntries = await FoodEntry.findAll({
      where: {
        user_id: userId,
        date: date,
      },
      include: [
        {
          model: NutritionalInfo,
          as: 'nutritionalInfo',
          attributes: ['nutrient_name', 'amount', 'unit', 'daily_value_percent'],
        },
      ],
    });

    let hasData = false;
    const nutrientTotals = {};

    foodEntries.forEach((entry) => {
      if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
        hasData = true;
        entry.nutritionalInfo.forEach((item) => {
          const nutrientName = item.nutrient_name;
          const amount = parseFloat(item.amount || 0);
          const dailyValuePercent = parseFloat(item.daily_value_percent || 0);
          const unit = item.unit || 'g';

          if (!nutrientTotals[nutrientName]) {
            nutrientTotals[nutrientName] = {
              total_amount: 0,
              unit: unit,
              daily_value_percent: 0,
              count: 0,
            };
          }

          nutrientTotals[nutrientName].total_amount += amount;
          nutrientTotals[nutrientName].daily_value_percent += dailyValuePercent;
          nutrientTotals[nutrientName].count += 1;
          if (unit) {
            nutrientTotals[nutrientName].unit = unit;
          }
        });
      }
    });

    if (!hasData) {
      return responseSuccess(res, 200, 'No nutritional data found for this date', {
        user_id: userId,
        date: date,
        total_nutrients: defaultNutrients,
        nutrient_count: Object.keys(defaultNutrients).length,
      });
    }

    Object.keys(nutrientTotals).forEach((key) => {
      nutrientTotals[key].total_amount = parseFloat(nutrientTotals[key].total_amount.toFixed(2));
      nutrientTotals[key].daily_value_percent = parseFloat(nutrientTotals[key].daily_value_percent.toFixed(2));
    });

    const responseData = {
      user_id: userId,
      date: date,
      total_nutrients: nutrientTotals,
      nutrient_count: Object.keys(nutrientTotals).length,
    };

    return responseSuccess(
      res,
      200,
      'Nutrition details fetched successfully',
      responseData
    );
  } catch (err) {
    return responseError(
      res,
      500,
      'Failed to fetch nutrition details',
      err.message
    );
  }
};

exports.getFoodSummaryDashboardByDateRange = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const { date, startDate, endDate } = req.query;

    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    let queryStartDate, queryEndDate;

    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }
      queryStartDate = date;
      queryEndDate = date;
    } else if (startDate && endDate) {
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }
      if (parsedStartDate > parsedEndDate) {
        return responseError(res, 400, 'startDate cannot be greater than endDate');
      }
      queryStartDate = startDate;
      queryEndDate = endDate;
    } else {
      return responseError(res, 400, 'Either date or both startDate and endDate are required');
    }

    const foodEntries = await FoodEntry.findAll({
      where: {
        user_id: userId,
        date: queryStartDate === queryEndDate
          ? queryStartDate
          : { [Op.between]: [queryStartDate, queryEndDate] },
      },
      include: [
        {
          model: NutritionalInfo,
          as: 'nutritionalInfo',
          attributes: ['nutrient_name', 'amount', 'unit'],
        },
      ],
      order: [['date', 'ASC']],
    });

    const nutrientMapping = {
      calories: ['calorie', 'calories', 'kcal', 'energy'],
      carbohydrates: ['carbohydrate', 'carbohydrates', 'carbs', 'total carbohydrate'],
      fat: ['fat', 'total fat'],
      protein: ['protein', 'proteins'],
      saturated_fat: ['saturated fat', 'saturated'],
      unsaturated_fat: ['unsaturated fat', 'unsaturated', 'monounsaturated', 'polyunsaturated'],
      cholesterol: ['cholesterol'],
      fiber: ['fiber', 'dietary fiber', 'fibre'],
      sugar: ['sugar', 'sugars', 'total sugar'],
    };

    const defaultNutrition = {
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

    const dateMap = {};
    const start = new Date(queryStartDate);
    const end = new Date(queryEndDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dateMap[dateKey] = { date: dateKey, ...defaultNutrition };
    }

    foodEntries.forEach((entry) => {
      const entryDate = entry.date || new Date(entry.created_date).toISOString().split('T')[0];

      if (!dateMap[entryDate]) return;

      dateMap[entryDate].water_intake += parseFloat(entry.water_content_ml || 0);

      if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
        entry.nutritionalInfo.forEach((nutrient) => {
          const nutrientNameLower = nutrient.nutrient_name.toLowerCase();

          Object.keys(nutrientMapping).forEach((field) => {
            const aliases = nutrientMapping[field];
            const isMatch = aliases.some((alias) => nutrientNameLower.includes(alias));
            if (isMatch) {
              dateMap[entryDate][field] += parseFloat(nutrient.amount || 0);
            }
          });
        });
      }
    });

    const chartData = Object.values(dateMap).map((item) => ({
      date: item.date,
      calories: parseFloat(item.calories.toFixed(2)),
      carbohydrates: parseFloat(item.carbohydrates.toFixed(2)),
      fat: parseFloat(item.fat.toFixed(2)),
      protein: parseFloat(item.protein.toFixed(2)),
      saturated_fat: parseFloat(item.saturated_fat.toFixed(2)),
      unsaturated_fat: parseFloat(item.unsaturated_fat.toFixed(2)),
      cholesterol: parseFloat(item.cholesterol.toFixed(2)),
      fiber: parseFloat(item.fiber.toFixed(2)),
      sugar: parseFloat(item.sugar.toFixed(2)),
      water_intake: parseFloat(item.water_intake.toFixed(2)),
    }));

    const responseData = {
      user_id: userId,
      date_range: {
        start_date: queryStartDate,
        end_date: queryEndDate,
      },
      total_entries: foodEntries.length,
      chart_data: chartData,
    };

    return responseSuccess(
      res,
      200,
      'Food summary fetched successfully',
      responseData
    );
  } catch (err) {
    return responseError(
      res,
      500,
      'Failed to fetch food summary',
      err.message
    );
  }
};

exports.getDailyFoodSummary = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const { date, startDate, endDate } = req.query;

    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    let queryStartDate, queryEndDate, displayDate;

    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }
      queryStartDate = date;
      queryEndDate = date;
      displayDate = date;
    } else if (startDate && endDate) {
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }
      if (parsedStartDate > parsedEndDate) {
        return responseError(res, 400, 'startDate cannot be greater than endDate');
      }
      queryStartDate = startDate;
      queryEndDate = endDate;
      displayDate = `${startDate} to ${endDate}`;
    } else {
      return responseError(res, 400, 'Either date or both startDate and endDate are required');
    }

    const foodEntries = await FoodEntry.findAll({
      where: {
        user_id: userId,
        date: queryStartDate === queryEndDate
          ? queryStartDate
          : { [Op.between]: [queryStartDate, queryEndDate] },
      },
      include: [
        {
          model: NutritionalInfo,
          as: 'nutritionalInfo',
          attributes: ['nutrient_name', 'amount', 'unit', 'daily_value_percent'],
        },
        {
          model: GroceryItem,
          as: 'groceryItems',
        },
        {
          model: FoodIngredient,
          as: 'foodIngredients',
          attributes: ['id', 'name', 'calories', 'protein_g', 'carbohydrates_g', 'fat_g', 'quantity'],
        },
      ],
      order: [['food_time', 'ASC']],
    });

    if (!foodEntries || foodEntries.length === 0) {
      // Build empty calories data for the date range
      const emptyCaloriesData = [];
      const emptyStart = new Date(queryStartDate);
      const emptyEnd = new Date(queryEndDate);
      for (let d = new Date(emptyStart); d <= emptyEnd; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        const dateObj = new Date(dateKey);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const formattedDate = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
        emptyCaloriesData.push({
          date: dateKey,
          day: dayName,
          formatted_date: formattedDate,
          calories: 0,
        });
      }
      const emptyTotalDays = Math.ceil((emptyEnd - new Date(queryStartDate)) / (1000 * 60 * 60 * 24)) + 1;

      return responseSuccess(res, 200, 'No food entries found for this date', {
        user_id: userId,
        date: displayDate,
        total_calories: 0,
        total_items: 0,
        calories: {
          description: `Day-wise calorie data from ${queryStartDate} to ${queryEndDate}`,
          total_entries: 0,
          date_range: {
            start_date: queryStartDate,
            end_date: queryEndDate,
            total_days: emptyTotalDays,
          },
          data: emptyCaloriesData,
        },
        total_nutritional_info: {},
        breakdown: {
          breakfast: { items: [], calories: 0, count: 0 },
          lunch: { items: [], calories: 0, count: 0 },
          dinner: { items: [], calories: 0, count: 0 },
          snack: { items: [], calories: 0, count: 0 },
        },
        all_groceries: [],
      });
    }

    const breakdown = {
      breakfast: { items: [], calories: 0, count: 0 },
      lunch: { items: [], calories: 0, count: 0 },
      dinner: { items: [], calories: 0, count: 0 },
      snack: { items: [], calories: 0, count: 0 },
    };

    let totalCalories = 0;
    const totalNutrition = {};
    const allGroceries = [];

    // Day-wise calorie data (same as nutrition dashboard)
    const dayWiseCalories = {};
    const start = new Date(queryStartDate);
    const end = new Date(queryEndDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dayWiseCalories[dateKey] = {
        date: dateKey,
        calories: 0,
      };
    }

    foodEntries.forEach((entry) => {
      const foodType = entry.food_type;
      let entryCalories = 0;

      const nutritionalInfo = {};
      if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
        entry.nutritionalInfo.forEach((nutrient) => {
          const nutrientNameLower = nutrient.nutrient_name.toLowerCase();

          if (nutrientNameLower.includes('calorie')) {
            entryCalories += parseFloat(nutrient.amount || 0);
          }

          const amountValue = parseFloat(nutrient.amount || 0);
          const unit = nutrient.unit || 'g';
          const amountKey = unit === 'mg' ? 'amount_mg' : unit === 'mcg' ? 'amount_mcg' : 'amount_g';

          nutritionalInfo[nutrient.nutrient_name] = {
            [amountKey]: amountValue,
            daily_value_percent: parseFloat(nutrient.daily_value_percent || 0),
          };

          if (!totalNutrition[nutrient.nutrient_name]) {
            totalNutrition[nutrient.nutrient_name] = {
              [amountKey]: 0,
              unit: unit,
              daily_value_percent: 0,
            };
          }
          totalNutrition[nutrient.nutrient_name][amountKey] = (totalNutrition[nutrient.nutrient_name][amountKey] || 0) + amountValue;
          totalNutrition[nutrient.nutrient_name].daily_value_percent += parseFloat(nutrient.daily_value_percent || 0);
        });
      }

      const ingredientsDetected = [];
      if (entry.foodIngredients && entry.foodIngredients.length > 0) {
        entry.foodIngredients.forEach((ingredient) => {
          ingredientsDetected.push({
            name: ingredient.name,
            calories: parseFloat(ingredient.calories || 0),
            protein_g: parseFloat(ingredient.protein_g || 0),
            carbohydrates_g: parseFloat(ingredient.carbohydrates_g || 0),
            fat_g: parseFloat(ingredient.fat_g || 0),
            quantity: ingredient.quantity || '',
          });
        });
      }

      const groceryItems = [];
      if (entry.groceryItems && entry.groceryItems.length > 0) {
        entry.groceryItems.forEach((grocery) => {
          const groceryItem = {
            name: grocery.name,
            approx_quantity_to_buy: grocery.approx_quantity_to_buy,
            category: grocery.category,
          };
          groceryItems.push(groceryItem);

          const exists = allGroceries.find(g => g.name === grocery.name);
          if (!exists) {
            allGroceries.push(groceryItem);
          }
        });
      }

      if (breakdown[foodType]) {
        breakdown[foodType].items.push({
          id: entry.id,
          dish_name: entry.food_name,
          food_time: entry.food_time,
          food_type: entry.food_type,
          total_weight_grams: entry.total_weight_grams,
          water_content_ml: entry.water_content_ml,
          food_image: entry.food_image,
          food_entry_source: entry.food_entry_source,
          calories: parseFloat(entryCalories.toFixed(2)),
          nutritional_info: nutritionalInfo,
          ingredients_detected: ingredientsDetected,
          grocery_items: groceryItems,
        });
        breakdown[foodType].calories += entryCalories;
        breakdown[foodType].count += 1;
        totalCalories += entryCalories;
      }

      // Accumulate calories per day
      const entryDate = entry.date || new Date(entry.created_date).toISOString().split('T')[0];
      if (dayWiseCalories[entryDate]) {
        dayWiseCalories[entryDate].calories += entryCalories;
      }
    });

    Object.keys(totalNutrition).forEach((key) => {
      const nutrient = totalNutrition[key];
      if (nutrient.amount_g !== undefined) {
        nutrient.amount_g = parseFloat(nutrient.amount_g.toFixed(2));
      }
      if (nutrient.amount_mg !== undefined) {
        nutrient.amount_mg = parseFloat(nutrient.amount_mg.toFixed(2));
      }
      if (nutrient.amount_mcg !== undefined) {
        nutrient.amount_mcg = parseFloat(nutrient.amount_mcg.toFixed(2));
      }
      nutrient.daily_value_percent = parseFloat(nutrient.daily_value_percent.toFixed(2));
      delete nutrient.unit;
    });

    Object.keys(breakdown).forEach((type) => {
      breakdown[type].calories = parseFloat(breakdown[type].calories.toFixed(2));
    });

    // Build calories data array (same format as nutrition dashboard)
    const caloriesData = Object.values(dayWiseCalories).map((day) => {
      const dateObj = new Date(day.date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const formattedDate = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
      return {
        date: day.date,
        day: dayName,
        formatted_date: formattedDate,
        calories: parseFloat(day.calories.toFixed(2)),
      };
    });

    // Calculate total days
    const totalDays = Math.ceil((new Date(queryEndDate) - new Date(queryStartDate)) / (1000 * 60 * 60 * 24)) + 1;

    const responseData = {
      user_id: userId,
      date: displayDate,
      total_calories: parseFloat(totalCalories.toFixed(2)),
      total_items: foodEntries.length,
      calories: {
        description: `Day-wise calorie data from ${queryStartDate} to ${queryEndDate}`,
        total_entries: foodEntries.length,
        date_range: {
          start_date: queryStartDate,
          end_date: queryEndDate,
          total_days: totalDays,
        },
        data: caloriesData,
      },
      total_nutritional_info: totalNutrition,
      breakdown: breakdown,
      all_groceries: allGroceries,
    };

    return responseSuccess(
      res,
      200,
      'Daily food summary fetched successfully',
      responseData
    );
  } catch (err) {
    return responseError(
      res,
      500,
      'Failed to fetch daily food summary',
      err.message
    );
  }
};

exports.deleteFoodEntry = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const { id } = req.params;

    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    if (!id) {
      return responseError(res, 400, 'Food entry ID is required');
    }

    const foodEntryId = Number(id);
    if (isNaN(foodEntryId)) {
      return responseError(res, 400, 'Invalid food entry ID');
    }

    // Find the food entry
    const foodEntry = await FoodEntry.findOne({
      where: {
        id: foodEntryId,
      },
    });

    if (!foodEntry) {
      return responseError(res, 404, 'Food entry not found');
    }

    // Check if the food entry belongs to the current user
    if (foodEntry.user_id !== userId) {
      return responseError(
        res,
        403,
        'Forbidden: You can only delete your own food entries'
      );
    }

    // Delete related records first (NutritionalInfo, GroceryItem, FoodIngredient)
    await NutritionalInfo.destroy({
      where: { food_entry_id: foodEntryId },
    });

    await GroceryItem.destroy({
      where: { food_entry_id: foodEntryId },
    });

    await FoodIngredient.destroy({
      where: { food_entry_id: foodEntryId },
    });

    // Delete the food entry
    await foodEntry.destroy();

    return responseSuccess(
      res,
      200,
      'Food entry deleted successfully',
      { id: foodEntryId }
    );
  } catch (err) {
    return responseError(
      res,
      500,
      'Failed to delete food entry',
      err.message
    );
  }
};

exports.getMacronutrientsDashboardByDateRange = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const { date, startDate, endDate } = req.query;

    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    let queryStartDate, queryEndDate, displayDate;

    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }
      queryStartDate = date;
      queryEndDate = date;
      displayDate = date;
    } else if (startDate && endDate) {
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }
      if (parsedStartDate > parsedEndDate) {
        return responseError(res, 400, 'startDate cannot be greater than endDate');
      }
      queryStartDate = startDate;
      queryEndDate = endDate;
      displayDate = `${startDate} to ${endDate}`;
    } else {
      return responseError(res, 400, 'Either date or both startDate and endDate are required');
    }

    const nutrientMapping = {
      calories: ['calorie', 'calories', 'kcal', 'energy'],
      carbohydrates: ['carbohydrate', 'carbohydrates', 'carbs', 'total carbohydrate'],
      fat: ['fat', 'total fat'],
      protein: ['protein', 'proteins'],
      saturated_fat: ['saturated fat', 'saturated'],
      unsaturated_fat: ['unsaturated fat', 'unsaturated', 'monounsaturated', 'polyunsaturated'],
      cholesterol: ['cholesterol'],
      fiber: ['fiber', 'dietary fiber', 'fibre'],
      sugar: ['sugar', 'sugars', 'total sugar'],
      sodium: ['sodium'],
      potassium: ['potassium'],
    };

    const foodEntries = await FoodEntry.findAll({
      where: {
        user_id: userId,
        date: queryStartDate === queryEndDate
          ? queryStartDate
          : { [Op.between]: [queryStartDate, queryEndDate] },
      },
      include: [
        {
          model: NutritionalInfo,
          as: 'nutritionalInfo',
          attributes: ['nutrient_name', 'amount', 'unit', 'daily_value_percent'],
        },
      ],
      order: [['date', 'ASC']],
    });

    // Calculate total days
    const totalDays = Math.ceil((new Date(queryEndDate) - new Date(queryStartDate)) / (1000 * 60 * 60 * 24)) + 1;

    // Initialize day-wise data
    const dayWiseData = {};
    const start = new Date(queryStartDate);
    const end = new Date(queryEndDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
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
        sodium: 0,
        potassium: 0,
        water_intake: 0,
      };
    }

    // Totals for the period
    let periodTotals = {
      calories: 0,
      carbohydrates: 0,
      fat: 0,
      protein: 0,
      saturated_fat: 0,
      unsaturated_fat: 0,
      cholesterol: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      potassium: 0,
      water_intake: 0,
    };

    // Process food entries
    foodEntries.forEach((entry) => {
      const entryDate = entry.date || new Date(entry.created_date).toISOString().split('T')[0];

      if (dayWiseData[entryDate]) {
        dayWiseData[entryDate].water_intake += parseFloat(entry.water_content_ml || 0);
        periodTotals.water_intake += parseFloat(entry.water_content_ml || 0);

        if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
          entry.nutritionalInfo.forEach((nutrient) => {
            const nutrientNameLower = nutrient.nutrient_name.toLowerCase();
            const amount = parseFloat(nutrient.amount || 0);

            Object.keys(nutrientMapping).forEach((field) => {
              const aliases = nutrientMapping[field];
              const isMatch = aliases.some((alias) => nutrientNameLower.includes(alias));
              if (isMatch && dayWiseData[entryDate][field] !== undefined) {
                dayWiseData[entryDate][field] += amount;
                periodTotals[field] += amount;
              }
            });
          });
        }
      }
    });

    // Build day-wise data array (same format as nutrition dashboard)
    const caloriesData = [];

    Object.values(dayWiseData).forEach((day) => {
      const dateObj = new Date(day.date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const formattedDate = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;

      caloriesData.push({
        date: day.date,
        day: dayName,
        formatted_date: formattedDate,
        calories: parseFloat(day.calories.toFixed(2)),
        carbohydrates: parseFloat(day.carbohydrates.toFixed(2)),
        fat: parseFloat(day.fat.toFixed(2)),
        protein: parseFloat(day.protein.toFixed(2)),
        fiber: parseFloat(day.fiber.toFixed(2)),
        sugar: parseFloat(day.sugar.toFixed(2)),
        saturated_fat: parseFloat(day.saturated_fat.toFixed(2)),
        unsaturated_fat: parseFloat(day.unsaturated_fat.toFixed(2)),
        cholesterol: parseFloat(day.cholesterol.toFixed(2)),
        water_intake: parseFloat(day.water_intake.toFixed(2)),
      });
    });

    // Fetch previous period data for change_percent calculation
    const prevPeriodEnd = new Date(queryStartDate);
    prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
    const prevPeriodStart = new Date(prevPeriodEnd);
    prevPeriodStart.setDate(prevPeriodEnd.getDate() - (totalDays - 1));
    const prevPeriodStartStr = prevPeriodStart.toISOString().split('T')[0];
    const prevPeriodEndStr = prevPeriodEnd.toISOString().split('T')[0];

    const prevPeriodEntries = await FoodEntry.findAll({
      where: {
        user_id: userId,
        date: { [Op.between]: [prevPeriodStartStr, prevPeriodEndStr] },
      },
      include: [
        {
          model: NutritionalInfo,
          as: 'nutritionalInfo',
          attributes: ['nutrient_name', 'amount'],
        },
      ],
    });

    let prevPeriodTotals = {
      carbohydrates: 0,
      fat: 0,
      protein: 0,
    };

    prevPeriodEntries.forEach((entry) => {
      if (entry.nutritionalInfo && entry.nutritionalInfo.length > 0) {
        entry.nutritionalInfo.forEach((nutrient) => {
          const nutrientNameLower = nutrient.nutrient_name.toLowerCase();
          const amount = parseFloat(nutrient.amount || 0);

          if (nutrientMapping.carbohydrates.some((alias) => nutrientNameLower.includes(alias))) {
            prevPeriodTotals.carbohydrates += amount;
          }
          if (nutrientMapping.fat.some((alias) => nutrientNameLower.includes(alias))) {
            prevPeriodTotals.fat += amount;
          }
          if (nutrientMapping.protein.some((alias) => nutrientNameLower.includes(alias))) {
            prevPeriodTotals.protein += amount;
          }
        });
      }
    });

    // Calculate percent change
    const calcPercentChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(1));
    };

    // Calculate macro percentages
    const totalMacroGrams = periodTotals.carbohydrates + periodTotals.fat + periodTotals.protein;
    const carbsPercent = totalMacroGrams > 0 ? (periodTotals.carbohydrates / totalMacroGrams) * 100 : 0;
    const fatPercent = totalMacroGrams > 0 ? (periodTotals.fat / totalMacroGrams) * 100 : 0;
    const proteinPercent = totalMacroGrams > 0 ? (periodTotals.protein / totalMacroGrams) * 100 : 0;

    // Build macronutrients summary (same format as nutrition dashboard)
    const macronutrientsData = {
      carbs: {
        daily_avg: parseFloat((periodTotals.carbohydrates / totalDays).toFixed(2)),
        percentage: parseFloat(carbsPercent.toFixed(0)),
        weekly_total: parseFloat(periodTotals.carbohydrates.toFixed(1)),
        change_percent: calcPercentChange(periodTotals.carbohydrates, prevPeriodTotals.carbohydrates),
        unit: 'g',
      },
      fat: {
        daily_avg: parseFloat((periodTotals.fat / totalDays).toFixed(2)),
        percentage: parseFloat(fatPercent.toFixed(0)),
        weekly_total: parseFloat(periodTotals.fat.toFixed(1)),
        change_percent: calcPercentChange(periodTotals.fat, prevPeriodTotals.fat),
        unit: 'g',
      },
      protein: {
        daily_avg: parseFloat((periodTotals.protein / totalDays).toFixed(2)),
        percentage: parseFloat(proteinPercent.toFixed(0)),
        weekly_total: parseFloat(periodTotals.protein.toFixed(1)),
        change_percent: calcPercentChange(periodTotals.protein, prevPeriodTotals.protein),
        unit: 'g',
      },
      other: {
        fiber: {
          daily_avg: parseFloat((periodTotals.fiber / totalDays).toFixed(2)),
          weekly_total: parseFloat(periodTotals.fiber.toFixed(1)),
          unit: 'g',
        },
        sugar: {
          daily_avg: parseFloat((periodTotals.sugar / totalDays).toFixed(2)),
          weekly_total: parseFloat(periodTotals.sugar.toFixed(1)),
          unit: 'g',
        },
        saturated_fat: {
          daily_avg: parseFloat((periodTotals.saturated_fat / totalDays).toFixed(2)),
          weekly_total: parseFloat(periodTotals.saturated_fat.toFixed(1)),
          unit: 'g',
        },
        unsaturated_fat: {
          daily_avg: parseFloat((periodTotals.unsaturated_fat / totalDays).toFixed(2)),
          weekly_total: parseFloat(periodTotals.unsaturated_fat.toFixed(1)),
          unit: 'g',
        },
        cholesterol: {
          daily_avg: parseFloat((periodTotals.cholesterol / totalDays).toFixed(2)),
          weekly_total: parseFloat(periodTotals.cholesterol.toFixed(1)),
          unit: 'mg',
        },
        water_intake: {
          daily_avg: parseFloat((periodTotals.water_intake / totalDays).toFixed(2)),
          weekly_total: parseFloat(periodTotals.water_intake.toFixed(1)),
          unit: 'ml',
        },
      },
    };

    const responseData = {
      user_id: userId,
      date_range: {
        start_date: queryStartDate,
        end_date: queryEndDate,
        total_days: totalDays,
      },
      calories: {
        description: `Day-wise calorie data from ${queryStartDate} to ${queryEndDate}`,
        total_entries: foodEntries.length,
        data: caloriesData,
      },
      macronutrients: {
        description: `Macronutrient summary with percentage distribution and period-over-period change`,
        data: macronutrientsData,
      },
    };

    return responseSuccess(
      res,
      200,
      'Macronutrients data fetched successfully',
      responseData
    );
  } catch (err) {
    return responseError(
      res,
      500,
      'Failed to fetch macronutrients data',
      err.message
    );
  }
};
