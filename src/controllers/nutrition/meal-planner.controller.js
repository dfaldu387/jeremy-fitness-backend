const { responseSuccess, responseError } = require('../../utils/response');
const MealPlanner = require('../../models/mealPlanner.model');
const { Op, Sequelize } = require('sequelize');
const { stringToArray } = require('./helpers/nutrition-calculations');
const axios = require('axios');
const { getMealPlanGenerationPrompt } = require('./helpers/ai-prompts');
const MealSchedule = require('../../models/userMealSchedule.model');
const Groceries = require('../../models/groceriesMeal.model');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.createMealPlanner = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    const {
      food_restrictions,
      food_allergies,
      food_preferences,
      nutrition_goals,
      date,
    } = req.body;

    const targetDate = date || new Date().toISOString().split('T')[0];

    if (isNaN(new Date(targetDate))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    if (
      !food_restrictions &&
      !food_allergies &&
      !food_preferences &&
      !nutrition_goals
    ) {
      return responseError(
        res,
        400,
        'At least one field (food_restrictions, food_allergies, food_preferences, or nutrition_goals) is required'
      );
    }

    const existingPlanner = await MealPlanner.findOne({
      where: {
        user_id: userId,
        date: targetDate,
      },
    });

    let mealPlanner;
    let isNewRecord = false;

    if (existingPlanner) {
      if (food_restrictions !== undefined) {
        const existing = existingPlanner.food_restrictions || '';
        const newValues = food_restrictions.trim();

        if (existing) {
          const existingArray = existing
            .split(';')
            .map((item) => item.trim().toLowerCase());
          const newArray = newValues.split(';').map((item) => item.trim());
          const uniqueNew = newArray.filter(
            (item) => !existingArray.includes(item.toLowerCase())
          );

          if (uniqueNew.length > 0) {
            existingPlanner.food_restrictions =
              existing + ';' + uniqueNew.join(';');
          }
        } else {
          existingPlanner.food_restrictions = newValues;
        }
      }

      if (food_allergies !== undefined) {
        const existing = existingPlanner.food_allergies || '';
        const newValues = food_allergies.trim();

        if (existing) {
          const existingArray = existing
            .split(';')
            .map((item) => item.trim().toLowerCase());
          const newArray = newValues.split(';').map((item) => item.trim());
          const uniqueNew = newArray.filter(
            (item) => !existingArray.includes(item.toLowerCase())
          );

          if (uniqueNew.length > 0) {
            existingPlanner.food_allergies =
              existing + ';' + uniqueNew.join(';');
          }
        } else {
          existingPlanner.food_allergies = newValues;
        }
      }

      if (food_preferences !== undefined) {
        const existing = existingPlanner.food_preferences || '';
        const newValues = food_preferences.trim();

        if (existing) {
          const existingArray = existing
            .split(';')
            .map((item) => item.trim().toLowerCase());
          const newArray = newValues.split(';').map((item) => item.trim());
          const uniqueNew = newArray.filter(
            (item) => !existingArray.includes(item.toLowerCase())
          );

          if (uniqueNew.length > 0) {
            existingPlanner.food_preferences =
              existing + ';' + uniqueNew.join(';');
          }
        } else {
          existingPlanner.food_preferences = newValues;
        }
      }

      if (nutrition_goals !== undefined) {
        const existing = existingPlanner.nutrition_goals || '';
        const newValues = nutrition_goals.trim();

        if (existing) {
          const existingArray = existing
            .split(';')
            .map((item) => item.trim().toLowerCase());
          const newArray = newValues.split(';').map((item) => item.trim());
          const uniqueNew = newArray.filter(
            (item) => !existingArray.includes(item.toLowerCase())
          );

          if (uniqueNew.length > 0) {
            existingPlanner.nutrition_goals =
              existing + ';' + uniqueNew.join(';');
          }
        } else {
          existingPlanner.nutrition_goals = newValues;
        }
      }

      await existingPlanner.save();
      mealPlanner = existingPlanner;
    } else {
      mealPlanner = await MealPlanner.create({
        user_id: userId,
        food_restrictions: food_restrictions || null,
        food_allergies: food_allergies || null,
        food_preferences: food_preferences || null,
        nutrition_goals: nutrition_goals || null,
        date: targetDate,
      });
      isNewRecord = true;
    }

    return responseSuccess(
      res,
      isNewRecord ? 201 : 200,
      isNewRecord
        ? 'Meal planner created successfully'
        : 'Meal planner updated successfully',
      {
        id: mealPlanner.id,
        user_id: mealPlanner.user_id,
        food_restrictions: stringToArray(mealPlanner.food_restrictions),
        food_allergies: stringToArray(mealPlanner.food_allergies),
        food_preferences: stringToArray(mealPlanner.food_preferences),
        nutrition_goals: stringToArray(mealPlanner.nutrition_goals),
        date: mealPlanner.date,
        created_date: mealPlanner.created_date,
        updated_date: mealPlanner.updated_date,
        is_new: isNewRecord,
      }
    );
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return responseError(
        res,
        400,
        'Validation error',
        error.errors.map((e) => e.message)
      );
    }
    return responseError(
      res,
      500,
      'Server error while creating meal planner',
      error.message
    );
  }
};

exports.getMealPlanner = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    const { date, startDate, endDate } = req.query;

    if (date) {
      if (isNaN(new Date(date))) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }

      const mealPlanner = await MealPlanner.findOne({
        where: {
          user_id: userId,
          date: date,
        },
      });

      if (!mealPlanner) {
        return responseError(res, 404, 'No meal planner found for this date');
      }

      return responseSuccess(res, 200, 'Meal planner fetched successfully', {
        id: mealPlanner.id,
        user_id: mealPlanner.user_id,
        food_restrictions: stringToArray(mealPlanner.food_restrictions),
        food_allergies: stringToArray(mealPlanner.food_allergies),
        food_preferences: stringToArray(mealPlanner.food_preferences),
        nutrition_goals: stringToArray(mealPlanner.nutrition_goals),
        date: mealPlanner.date,
        created_date: mealPlanner.created_date,
        updated_date: mealPlanner.updated_date,
      });
    }

    if (startDate && endDate) {
      if (isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }

      const mealPlanners = await MealPlanner.findAll({
        where: {
          user_id: userId,
          date: {
            [Op.between]: [startDate, endDate],
          },
        },
        order: [['date', 'ASC']],
      });

      if (!mealPlanners || mealPlanners.length === 0) {
        return responseSuccess(
          res,
          200,
          'No meal planners found for this date range',
          []
        );
      }

      return responseSuccess(res, 200, 'Meal planners fetched successfully', {
        total_count: mealPlanners.length,
        date_range: {
          start: startDate,
          end: endDate,
        },
        meal_planners: mealPlanners.map((mp) => ({
          id: mp.id,
          user_id: mp.user_id,
          food_restrictions: stringToArray(mp.food_restrictions),
          food_allergies: stringToArray(mp.food_allergies),
          food_preferences: stringToArray(mp.food_preferences),
          nutrition_goals: stringToArray(mp.nutrition_goals),
          date: mp.date,
          created_date: mp.created_date,
          updated_date: mp.updated_date,
        })),
      });
    }

    return responseError(
      res,
      400,
      'Either date or both startDate and endDate are required'
    );
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while fetching meal planner',
      error.message
    );
  }
};

exports.generateMealPlanWithAI = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!userId) {
      return responseError(res, 401, "Unauthorized: User ID missing in token");
    }

    const mealPlannerId = req.query.meal_planner_id
      ? Number(req.query.meal_planner_id)
      : null;

    const date = req.query.date;

    if (!date) {
      return responseError(res, 400, "date is required (YYYY-MM-DD)");
    }

    if (isNaN(new Date(date))) {
      return responseError(res, 400, "Invalid date format. Use YYYY-MM-DD");
    }

    if (!mealPlannerId) {
      return responseError(res, 400, "meal_planner_id is required");
    }

    const whereClause = {
      id: mealPlannerId,
      user_id: userId,
      date: date,
    };

    const mealPlanner = await MealPlanner.findOne({ where: whereClause });

    if (!mealPlanner) {
      return responseError(
        res,
        404,
        "No meal planner found for this user + date + meal_planner_id"
      );
    }

    const prompt = getMealPlanGenerationPrompt(mealPlanner);

    const openaiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert nutritionist. Respond ONLY in valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let aiResponse = openaiResponse.data.choices[0].message.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let planData;
    try {
      planData = JSON.parse(aiResponse);
    } catch (err) {
      return responseError(res, 500, "AI returned invalid JSON", aiResponse);
    }

    const formattedResponse = {
      mealPlanner: {
        header: {
          title: "Meal Planner",
          tabs: ["Meal Calendar", "Meal Planner"],
        },
        goalSection: planData.goalSection,
        dailyCalories: planData.dailyCalories,
        fitnessSection: planData.fitnessSection,
        mealPlanOverview: planData.mealPlanOverview,
        dailyFlow: planData.dailyFlow,
        actions: {
          primary: "Accept and get started!",
          secondary: "Make changes and recreate",
          note: "You will be able to make changes later if desired.",
        },
        meta: {
          date,
          meal_planner_id: mealPlanner.id,
          user_preferences: {
            food_restrictions: mealPlanner.food_restrictions || "None",
            food_allergies: mealPlanner.food_allergies || "None",
            food_preferences: mealPlanner.food_preferences || "None",
            nutrition_goals: mealPlanner.nutrition_goals || "General Health",
          },
          filters_used: {
            user_id: userId,
            meal_planner_id: mealPlannerId,
            date,
          },
        },
      },
    };

    return responseSuccess(
      res,
      200,
      "Meal plan generated successfully",
      formattedResponse
    );

  } catch (error) {
    if (error.response?.data) {
      return responseError(res, 500, "OpenAI API error", error.response.data);
    }

    return responseError(
      res,
      500,
      "Server error while generating meal plan",
      error.message
    );
  }
};

exports.saveMealSchedule = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { date, schedule } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!date || !schedule || !Array.isArray(schedule)) {
      return res.status(400).json({
        message: "date and schedule[] are required",
      });
    }

    await MealSchedule.destroy({
      where: { user_id: userId, date },
    });

    const rows = schedule.map((item) => ({
      user_id: userId,
      date,
      time: item.time,
      meal: item.meal,
      recipe_id: item.recipe_id || null,
      example: item.example,
      dish_name: item.dish_name || null,
      description: item.description || null,
      servings: item.servings || null,
      prep_time_minutes: item.prep_time_minutes || null,
      cook_time_minutes: item.cook_time_minutes || null,
      total_time_minutes: item.total_time_minutes || null,
      ingredients: item.ingredients || null,
      cooking_steps_instructions: item.cooking_steps_instructions || null,
      nutrition_facts: item.nutrition_facts || null,
      groceries: item.groceries || [],
    }));

    const savedSchedules = await MealSchedule.bulkCreate(rows);

    const formattedData = savedSchedules.map(item => ({
      id: item.id,
      user_id: item.user_id,
      date: item.date,
      time: item.time,
      meal: item.meal,
      recipe_id: item.recipe_id,
      example: item.example,
      dish_name: item.dish_name,
      description: item.description,
      servings: item.servings,
      prep_time_minutes: item.prep_time_minutes,
      cook_time_minutes: item.cook_time_minutes,
      total_time_minutes: item.total_time_minutes,
      ingredients: item.ingredients || null,
      cooking_steps_instructions: item.cooking_steps_instructions || null,
      nutrition_facts: item.nutrition_facts || null,
      groceries: item.groceries || [],
    }));

    return res.status(200).json({
      message: "Meal schedule saved successfully",
      saved: rows.length,
      data: formattedData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getMealSchedule = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { date, startDate, endDate, type } = req.query;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const whereCondition = {
      user_id: userId,
    };

    if (date) {
      if (isNaN(new Date(date))) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }
      whereCondition.date = date;
    }
    else if (startDate && endDate) {
      if (isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }
      whereCondition.date = {
        [Op.between]: [startDate, endDate],
      };
    }
    else if (startDate) {
      if (isNaN(new Date(startDate))) {
        return res.status(400).json({ message: "Invalid startDate format. Use YYYY-MM-DD" });
      }
      whereCondition.date = {
        [Op.gte]: startDate,
      };
    }
    if (type) {
      whereCondition.meal = type;
    }

    const meals = await MealSchedule.findAll({
      where: whereCondition,
      order: [["date", "ASC"], ["time", "ASC"]],
    });

    const grouped = {};

    meals.forEach(item => {
      if (!grouped[item.meal]) grouped[item.meal] = [];

      let groceriesArray = [];
      let ingredientsArray = [];

      if (item.groceries) {
        try {
          groceriesArray = typeof item.groceries === "string"
            ? JSON.parse(item.groceries)
            : item.groceries;

          if (!Array.isArray(groceriesArray)) {
            groceriesArray = JSON.parse(groceriesArray);
          }

          groceriesArray = groceriesArray.map(g => ({
            item: (g.item || "").trim(),
            quantity: (g.quantity || "").trim(),
          }));
        } catch (err) {
          groceriesArray = [];
        }
      }

      if (item.ingredients) {
        try {
          ingredientsArray = typeof item.ingredients === "string"
            ? JSON.parse(item.ingredients)
            : item.ingredients;

          if (!Array.isArray(ingredientsArray)) {
            ingredientsArray = JSON.parse(ingredientsArray);
          }
        } catch (err) {
          ingredientsArray = [];
        }
      }

      let cookingStepsArray = [];
      if (item.cooking_steps_instructions) {
        try {
          let parsed = item.cooking_steps_instructions;
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
          cookingStepsArray = Array.isArray(parsed) ? parsed : [];
        } catch (err) {
          console.error("Error parsing cooking_steps_instructions:", err);
          cookingStepsArray = [];
        }
      }

      let nutritionFactsObj = null;
      if (item.nutrition_facts) {
        try {
          let parsed = item.nutrition_facts;
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
          nutritionFactsObj = typeof parsed === "object" ? parsed : null;
        } catch (err) {
          console.error("Error parsing nutrition_facts:", err);
          nutritionFactsObj = null;
        }
      }

      grouped[item.meal].push({
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
        updated_date: item.updated_date
      });
    });

    return res.status(200).json({
      message: "Meal schedule fetched successfully",
      filteredBy: {
        date: date || null,
        dateRange: (startDate || endDate) ? { startDate, endDate } : null,
        mealType: type || "all"
      },
      totalRecords: meals.length,
      data: grouped,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.addGroceries = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { meal_schedule_id, date } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!meal_schedule_id)
      return res.status(400).json({ message: "meal_schedule_id is required" });
    if (!date)
      return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });

    if (isNaN(new Date(date))) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const existingGroceries = await Groceries.findAll({
      where: {
        user_id: userId,
        meal_schedule_id,
        grocery_date: date,
        status: "active",
      },
    });

    if (existingGroceries.length > 0) {
      return res.status(409).json({
        message: "Groceries already added for this date",
        already_added: existingGroceries.length,
        date,
      });
    }

    const meal = await MealSchedule.findOne({
      where: { id: meal_schedule_id },
    });

    if (!meal) {
      return res.status(404).json({ message: "Meal schedule not found" });
    }

    let groceriesList = [];
    let data = meal.groceries;

    try {
      if (typeof data === "string") data = JSON.parse(data);
      if (!Array.isArray(data)) data = [data];
      groceriesList = data || [];
    } catch (err) {
      groceriesList = [];
    }

    if (groceriesList.length === 0) {
      return res.status(400).json({ message: "No groceries found" });
    }

    const rowsToInsert = groceriesList.map((g) => ({
      user_id: userId,
      meal_schedule_id,
      item: g.item || "",
      quantity: g.quantity || "",
      grocery_date: date,
      status: "active",
    }));

    await Groceries.bulkCreate(rowsToInsert);

    return res.status(200).json({
      message: "Groceries added successfully",
      added: groceriesList.length,
      date,
      items: groceriesList,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getUserGroceries = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, recipe_id, page = 1, limit = 10, status = "active" } = req.query;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const validStatuses = ["active", "deleted"];
    const groceryStatus = validStatuses.includes(status) ? status : "active";

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const whereMealSchedule = { user_id: userId };

    if (startDate && endDate) {
      whereMealSchedule.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      whereMealSchedule.date = startDate;
    }

    const totalMealSchedules = await MealSchedule.count({
      where: whereMealSchedule,
    });

    const mealSchedules = await MealSchedule.findAll({
      where: whereMealSchedule,
      attributes: ["id", "date", "meal", "example", "dish_name"],
      order: [["date", "ASC"], ["time", "ASC"]],
      limit: limitNum,
      offset: offset,
    });

    if (!mealSchedules.length) {
      return res.status(200).json({
        message: "No meal schedules found",
        data: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalRecords: 0,
          limit: limitNum,
        },
      });
    }

    const mealScheduleIds = mealSchedules.map((m) => m.id);

    const groceryWhere = {
      user_id: userId,
      meal_schedule_id: mealScheduleIds,
      status: groceryStatus,
    };

    if (recipe_id) groceryWhere.recipe_id = recipe_id;

    const groceries = await Groceries.findAll({
      where: groceryWhere,
      order: [[Sequelize.col("created_date"), "ASC"]],
    });

    const grouped = {};
    mealSchedules.forEach((ms) => {
      grouped[ms.id] = {
        date: ms.date,
        meal: ms.meal,
        meal_name: ms.dish_name,
        example: ms.example,
        groceries: [],
      };
    });

    groceries.forEach((g) => {
      const mealInfo = grouped[g.meal_schedule_id];
      grouped[g.meal_schedule_id].groceries.push({
        id: g.id,
        recipe_id: g.recipe_id,
        item: g.item,
        quantity: g.quantity,
        status: g.status,
        meal_name: mealInfo?.meal_name || null,
        meal_date: mealInfo?.date || null,
      });
    });

    const totalPages = Math.ceil(totalMealSchedules / limitNum);

    return res.status(200).json({
      message: "Groceries fetched successfully",
      data: Object.values(grouped),
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalRecords: totalMealSchedules,
        limit: limitNum,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteMultipleGroceries = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { grocery_ids } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!Array.isArray(grocery_ids) || grocery_ids.length === 0) {
      return res.status(400).json({ message: "grocery_ids array is required" });
    }

    const updatedRows = await Groceries.update(
      { status: "deleted" },
      {
        where: {
          id: grocery_ids,
          user_id: userId,
          status: "active",
        },
      }
    );

    if (updatedRows[0] === 0) {
      return res.status(404).json({ message: "No groceries found to delete" });
    }

    return res.status(200).json({
      message: "Groceries deleted (soft-delete) successfully",
      deleted_ids: grocery_ids,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.clearMealPlanner = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    const { id } = req.query;

    if (!id) {
      return responseError(res, 400, 'id is required');
    }

    const mealPlannerId = Number(id);
    if (isNaN(mealPlannerId)) {
      return responseError(res, 400, 'Invalid id');
    }

    const deletedCount = await MealPlanner.destroy({
      where: {
        id: mealPlannerId,
        user_id: userId,
      },
    });

    if (deletedCount === 0) {
      return responseError(
        res,
        404,
        'Meal planner not found or does not belong to this user'
      );
    }

    return responseSuccess(res, 200, 'Meal planner deleted successfully', {
      deleted_id: mealPlannerId,
    });
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while clearing meal planner',
      error.message
    );
  }
};

exports.toggleMealScheduleFavorite = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(res, 401, 'Unauthorized: User ID not found in token');
    }

    const { id } = req.params;
    if (!id) {
      return responseError(res, 400, 'Meal schedule ID is required');
    }

    const mealSchedule = await MealSchedule.findOne({
      where: { id: id, user_id: userId }
    });

    if (!mealSchedule) {
      return responseError(res, 404, 'Meal schedule not found');
    }

    await mealSchedule.update({ is_favorite: !mealSchedule.is_favorite });

    return responseSuccess(res, 200, `Meal ${mealSchedule.is_favorite ? 'added to' : 'removed from'} favorites`, {
      id: mealSchedule.id,
      dish_name: mealSchedule.dish_name || mealSchedule.example,
      meal: mealSchedule.meal,
      date: mealSchedule.date,
      is_favorite: mealSchedule.is_favorite
    });
  } catch (error) {
    return responseError(res, 500, 'Server error while updating favorite status', error.message);
  }
};

exports.getFavoriteMealSchedules = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(res, 401, 'Unauthorized: User ID not found in token');
    }

    const { date, startDate, endDate } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const whereClause = { user_id: userId, is_favorite: true };

    if (date) {
      if (isNaN(new Date(date))) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }
      whereClause.date = date;
    } else if (startDate && endDate) {
      if (isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }
      whereClause.date = { [Op.between]: [startDate, endDate] };
    }

    const { count, rows: meals } = await MealSchedule.findAndCountAll({
      where: whereClause,
      order: [['updated_date', 'DESC']],
      limit: limit,
      offset: offset
    });

    const formattedMeals = meals.map(item => {
      let groceriesArray = [];
      let ingredientsArray = [];
      let cookingStepsArray = [];
      let nutritionFactsObj = null;

      if (item.groceries) {
        try {
          groceriesArray = typeof item.groceries === "string" ? JSON.parse(item.groceries) : item.groceries;
          if (!Array.isArray(groceriesArray)) groceriesArray = JSON.parse(groceriesArray);
        } catch (err) {
          groceriesArray = [];
        }
      }

      if (item.ingredients) {
        try {
          ingredientsArray = typeof item.ingredients === "string" ? JSON.parse(item.ingredients) : item.ingredients;
          if (!Array.isArray(ingredientsArray)) ingredientsArray = JSON.parse(ingredientsArray);
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

      return {
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
        updated_date: item.updated_date
      };
    });

    return responseSuccess(res, 200, 'Favorite meals retrieved successfully', {
      total: count,
      limit: limit,
      offset: offset,
      meals: formattedMeals
    });
  } catch (error) {
    return responseError(res, 500, 'Server error while retrieving favorite meals', error.message);
  }
};

exports.getMealCalendar = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!userId) {
      return responseError(res, 401, "Unauthorized: User ID not found in token");
    }

    const { month, year } = req.query;

    let targetYear, targetMonth;

    if (month && year) {
      targetYear = parseInt(year, 10);
      targetMonth = parseInt(month, 10) - 1;

      if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 0 || targetMonth > 11) {
        return responseError(res, 400, "Invalid month or year. Month should be 1-12, year should be a valid year");
      }
    } else {
      const today = new Date();
      targetYear = today.getFullYear();
      targetMonth = today.getMonth();
    }

    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0);
    const totalDaysInMonth = monthEnd.getDate();

    const monthStartStr = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-01`;
    const monthEndStr = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(totalDaysInMonth).padStart(2, "0")}`;
    const monthName = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const monthMeals = await MealSchedule.findAll({
      where: {
        user_id: userId,
        date: { [Op.between]: [monthStartStr, monthEndStr] },
      },
      order: [["date", "ASC"], ["time", "ASC"]],
    });

    const mealCalendar = {};

    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateObj = new Date(targetYear, targetMonth, dayNum);
      const dateKey = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
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

    return responseSuccess(res, 200, "Meal calendar fetched successfully", {
      month: monthName,
      month_number: targetMonth + 1,
      year: targetYear,
      month_start: monthStartStr,
      month_end: monthEndStr,
      total_days: mealCalendarArray.length,
      days_with_meals: daysWithMeals,
      total_meals: monthMeals.length,
      data: mealCalendarArray,
    });

  } catch (error) {
    return responseError(
      res,
      500,
      "Server error while fetching meal calendar",
      error.message
    );
  }
};


exports.getUserPersonalFoodProfile = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!userId) {
      return responseError(res, 401, "Unauthorized: User ID not found in token");
    }

    const { date } = req.query;

    const whereClause = { user_id: userId };

    if (date) {
      if (isNaN(new Date(date))) {
        return responseError(res, 400, "Invalid date format. Use YYYY-MM-DD");
      }
      whereClause.date = date;
    }

    const mealPlanner = await MealPlanner.findOne({
      where: whereClause,
      order: [["date", "DESC"]],
    });

    if (!mealPlanner) {
      return responseSuccess(res, 200, "No personal food data found", {
        food_restrictions: [],
        food_allergies: [],
        food_preferences: [],
        nutrition_goals: [],
      });
    }

    return responseSuccess(
      res,
      200,
      "Personal food profile fetched successfully",
      {
        food_restrictions: stringToArray(mealPlanner.food_restrictions),
        food_allergies: stringToArray(mealPlanner.food_allergies),
        food_preferences: stringToArray(mealPlanner.food_preferences),
        nutrition_goals: stringToArray(mealPlanner.nutrition_goals),
        date: mealPlanner.date,
        updated_date: mealPlanner.updated_date,
      }
    );
  } catch (error) {
    return responseError(
      res,
      500,
      "Server error while fetching personal food profile",
      error.message
    );
  }
};

exports.updateUserPersonalFoodProfile = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!userId) {
      return responseError(res, 401, "Unauthorized: User ID not found in token");
    }

    const { meal_planner_id, date } = req.query;

    if (!meal_planner_id && !date) {
      return responseError(
        res,
        400,
        "meal_planner_id or date is required to update profile"
      );
    }

    if (date && isNaN(new Date(date))) {
      return responseError(res, 400, "Invalid date format. Use YYYY-MM-DD");
    }

    const whereClause = {
      user_id: userId,
    };

    if (meal_planner_id) whereClause.id = Number(meal_planner_id);
    if (date) whereClause.date = date;

    const mealPlanner = await MealPlanner.findOne({ where: whereClause });

    if (!mealPlanner) {
      return responseError(res, 404, "Meal planner record not found");
    }

    const {
      food_restrictions,
      food_allergies,
      food_preferences,
      nutrition_goals,
    } = req.body;

    const mergeField = (existingValue, newValue) => {
      if (!newValue) return existingValue || null;

      const existingArray = stringToArray(existingValue).map(v => v.toLowerCase());
      const newArray = stringToArray(newValue);

      const uniqueNew = newArray.filter(
        item => !existingArray.includes(item.toLowerCase())
      );

      const merged = [...existingArray, ...uniqueNew];

      return merged.length ? merged.join(";") : null;
    };

    if (food_restrictions !== undefined) {
      mealPlanner.food_restrictions = mergeField(
        mealPlanner.food_restrictions,
        food_restrictions
      );
    }

    if (food_allergies !== undefined) {
      mealPlanner.food_allergies = mergeField(
        mealPlanner.food_allergies,
        food_allergies
      );
    }

    if (food_preferences !== undefined) {
      mealPlanner.food_preferences = mergeField(
        mealPlanner.food_preferences,
        food_preferences
      );
    }

    if (nutrition_goals !== undefined) {
      mealPlanner.nutrition_goals = mergeField(
        mealPlanner.nutrition_goals,
        nutrition_goals
      );
    }

    await mealPlanner.save();

    return responseSuccess(res, 200, "Personal food profile updated successfully", {
      id: mealPlanner.id,
      user_id: mealPlanner.user_id,
      food_restrictions: stringToArray(mealPlanner.food_restrictions),
      food_allergies: stringToArray(mealPlanner.food_allergies),
      food_preferences: stringToArray(mealPlanner.food_preferences),
      nutrition_goals: stringToArray(mealPlanner.nutrition_goals),
      date: mealPlanner.date,
      updated_date: mealPlanner.updated_date,
    });

  } catch (error) {
    return responseError(
      res,
      500,
      "Server error while updating personal food profile",
      error.message
    );
  }
};
