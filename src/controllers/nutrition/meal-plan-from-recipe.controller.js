const { responseSuccess, responseError } = require('../../utils/response');
const MealPlanFromRecipe = require('../../models/mealPlanFromRecipe.model');
const RecipeHistory = require('../../models/recipeHistory.model');
const axios = require('axios');
const { getRecipeGenerationPrompt } = require('./helpers/ai-prompts');

exports.generateRecipeFromDishName = async (req, res) => {
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
      dish_name,
      servings,
      dietary_preferences,
      cooking_time,
      date
    } = req.body;

    if (!dish_name || dish_name.trim() === '') {
      return responseError(res, 400, 'dish_name is required');
    }

    const recipeDate = date || new Date().toISOString().split('T')[0];

    if (date && isNaN(new Date(date))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const prompt = getRecipeGenerationPrompt({
      dish_name,
      servings,
      dietary_preferences,
      cooking_time,
    });

    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert chef and recipe developer. Respond ONLY with valid JSON, no markdown or additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2500,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let aiResponse = openaiResponse.data.choices[0].message.content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let recipeData;
    try {
      recipeData = JSON.parse(aiResponse);
    } catch (error) {
      return responseError(res, 500, 'AI returned invalid JSON', aiResponse);
    }

    const savedRecipe = await RecipeHistory.create({
      user_id: userId,
      date: recipeDate,
      dish_name: recipeData.dish_name,
      description: recipeData.description,
      servings: recipeData.servings,
      prep_time_minutes: recipeData.prep_time_minutes,
      cook_time_minutes: recipeData.cook_time_minutes,
      total_time_minutes: recipeData.total_time_minutes,
      ingredients: recipeData.ingredients,
      cooking_steps_instructions: recipeData.instructions,
      nutrition_facts: recipeData.nutrition_facts
    });

    return responseSuccess(
      res,
      200,
      'Recipe generated and saved successfully',
      {
        id: savedRecipe.id,
        user_id: savedRecipe.user_id,
        date: savedRecipe.date,
        dish_name: savedRecipe.dish_name,
        description: savedRecipe.description,
        servings: savedRecipe.servings,
        prep_time_minutes: savedRecipe.prep_time_minutes,
        cook_time_minutes: savedRecipe.cook_time_minutes,
        total_time_minutes: savedRecipe.total_time_minutes,
        ingredients: savedRecipe.ingredients,
        cooking_steps_instructions: savedRecipe.cooking_steps_instructions,
        nutrition_facts: savedRecipe.nutrition_facts,
      }
    );
  } catch (error) {
    if (error.response?.data) {
      return responseError(res, 500, 'OpenAI API error', error.response.data);
    }
    return responseError(
      res,
      500,
      'Server error while generating recipe',
      error.message
    );
  }
};

exports.addRecipeToMealPlan = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    const { recipe_id, date, meal_type } = req.body;

    if (!recipe_id || !date || !meal_type) {
      return responseError(
        res,
        400,
        'recipe_id, date, and meal_type are required'
      );
    }

    const recipeId = Number(recipe_id);
    if (isNaN(recipeId) || recipeId <= 0) {
      return responseError(
        res,
        400,
        'recipe_id must be a valid positive number'
      );
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(meal_type)) {
      return responseError(
        res,
        400,
        'meal_type must be one of: breakfast, lunch, dinner, snack'
      );
    }

    if (isNaN(new Date(date))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const recipe = await RecipeHistory.findOne({
      where: {
        id: recipeId,
        user_id: userId,
      },
    });

    if (!recipe) {
      return responseError(
        res,
        404,
        'Recipe not found or does not belong to you'
      );
    }

    const existingRecipeOnDate = await MealPlanFromRecipe.findOne({
      where: {
        user_id: userId,
        recipe_id: recipeId,
        date: date,
        meal_type: meal_type
      },
    });

    if (existingRecipeOnDate) {
      return responseError(
        res,
        400,
        'This recipe is already added in your meal plan for this date'
      );
    }

    const mealPlan = await MealPlanFromRecipe.create({
      user_id: userId,
      recipe_id: recipeId,
      date: date,
      meal_type: meal_type,
      is_completed: false,
    });

    const mealPlanWithRecipe = await MealPlanFromRecipe.findOne({
      where: { id: mealPlan.id },
      include: [
        {
          model: RecipeHistory,
          as: 'recipe',
          attributes: [
            'id',
            'dish_name',
            'description',
            'servings',
            'prep_time_minutes',
            'cook_time_minutes',
            'total_time_minutes',
            'ingredients',
            'cooking_steps_instructions',
            'nutrition_facts',
          ],
        },
      ],
    });

    return responseSuccess(
      res,
      200,
      'Recipe added to meal plan successfully',
      mealPlanWithRecipe || mealPlan
    );
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while adding recipe to meal plan',
      error.message
    );
  }
};

exports.getRecipesFromMealPlan = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    const { date } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!date) {
      return responseError(res, 400, 'date is required');
    }

    if (isNaN(new Date(date))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const { count, rows: mealPlans } = await MealPlanFromRecipe.findAndCountAll({
      where: {
        user_id: userId,
        date: date,
      },
      include: [
        {
          model: RecipeHistory,
          as: 'recipe',
        },
      ],
      order: [['meal_type', 'ASC']],
      limit: limit,
      offset: offset,
    });

    return responseSuccess(
      res,
      200,
      `Meal plan recipes for ${date} retrieved successfully`,
      {
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit),
        date: date,
        mealPlans: mealPlans,
      }
    );
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while fetching meal plan recipes',
      error.message
    );
  }
};

exports.deleteMealPlanRecipe = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    const { id } = req.params;
    const { date } = req.query;

    if (!id) {
      return responseError(res, 400, 'Meal plan recipe ID is required');
    }

    const whereClause = {
      id: id,
      user_id: userId,
    };

    if (date) {
      if (isNaN(new Date(date))) {
        return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
      }
      whereClause.date = date;
    }

    const mealPlanRecipe = await MealPlanFromRecipe.findOne({ where: whereClause });

    if (!mealPlanRecipe) {
      return responseError(res, 404, 'Meal plan recipe not found or does not belong to you');
    }

    await mealPlanRecipe.destroy();

    return responseSuccess(res, 200, 'Meal plan recipe deleted successfully', { id: id });
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while deleting meal plan recipe',
      error.message
    );
  }
};

exports.getAllRecipeHistoryByUser = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    const { date } = req.query;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    if (date && isNaN(new Date(date))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const whereClause = {
      user_id: userId,
    };

    if (date) {
      whereClause.date = date;
    }

    const { count, rows: recipes } = await RecipeHistory.findAndCountAll({
      where: whereClause,
      order: [['created_date', 'DESC']],
      limit: limit,
      offset: offset,
    });

    return responseSuccess(
      res,
      200,
      date
        ? `Recipe history for ${date} retrieved successfully`
        : 'Recipe history retrieved successfully',
      {
        total: count,
        limit: limit,
        offset: offset,
        date: date || 'all',
        recipes: recipes
      }
    );
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while retrieving recipe history',
      error.message
    );
  }
};

exports.toggleRecipeFavorite = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    const { id } = req.params;

    if (!id) {
      return responseError(res, 400, 'Recipe ID is required');
    }

    const recipe = await RecipeHistory.findOne({
      where: {
        id: id,
        user_id: userId,
      },
    });

    if (!recipe) {
      return responseError(res, 404, 'Recipe not found');
    }

    await recipe.update({
      is_favorite: !recipe.is_favorite,
    });

    return responseSuccess(
      res,
      200,
      `Recipe ${recipe.is_favorite ? 'added to' : 'removed from'} favorites`,
      {
        id: recipe.id,
        dish_name: recipe.dish_name,
        is_favorite: recipe.is_favorite,
      }
    );
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while updating favorite status',
      error.message
    );
  }
};

exports.getFavoriteRecipesByUser = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    const { date } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    if (date && isNaN(new Date(date))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const whereClause = {
      user_id: userId,
      is_favorite: true,
    };

    if (date) {
      whereClause.date = date;
    }

    const { count, rows: recipes } = await RecipeHistory.findAndCountAll({
      where: whereClause,
      order: [['updated_date', 'DESC']],
      limit: limit,
      offset: offset,
    });

    return responseSuccess(
      res,
      200,
      date
        ? `Favorite recipes for ${date} retrieved successfully`
        : 'Favorite recipes retrieved successfully',
      {
        total: count,
        limit: limit,
        offset: offset,
        date: date || 'all',
        recipes: recipes,
      }
    );
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while retrieving favorite recipes',
      error.message
    );
  }
};

exports.getRecipesFromMealPlan = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(
        res,
        401,
        'Unauthorized: User ID not found in token'
      );
    }

    const { date, meal_type } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    if (date && isNaN(new Date(date))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (meal_type && !validMealTypes.includes(meal_type)) {
      return responseError(
        res,
        400,
        'meal_type must be one of: breakfast, lunch, dinner, snack'
      );
    }

    const whereClause = {
      user_id: userId,
    };

    if (date) {
      whereClause.date = date;
    }

    if (meal_type) {
      whereClause.meal_type = meal_type;
    }

    const { count, rows: mealPlans } = await MealPlanFromRecipe.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: RecipeHistory,
          as: 'recipe',
          attributes: [
            'id',
            'dish_name',
            'description',
            'servings',
            'prep_time_minutes',
            'cook_time_minutes',
            'total_time_minutes',
            'ingredients',
            'cooking_steps_instructions',
            'nutrition_facts',
            'is_favorite',
          ],
        },
      ],
      order: [['date', 'DESC'], ['meal_type', 'ASC']],
      limit: limit,
      offset: offset,
    });

    const formattedMealPlans = mealPlans.map(plan => {
      const planData = plan.toJSON();

      if (planData.recipe) {
        if (typeof planData.recipe.ingredients === 'string') {
          try {
            planData.recipe.ingredients = JSON.parse(planData.recipe.ingredients);
          } catch (e) {
            planData.recipe.ingredients = [];
          }
        }

        if (typeof planData.recipe.cooking_steps_instructions === 'string') {
          try {
            planData.recipe.cooking_steps_instructions = JSON.parse(planData.recipe.cooking_steps_instructions);
          } catch (e) {
            planData.recipe.cooking_steps_instructions = [];
          }
        }

        if (typeof planData.recipe.nutrition_facts === 'string') {
          try {
            planData.recipe.nutrition_facts = JSON.parse(planData.recipe.nutrition_facts);
          } catch (e) {
            planData.recipe.nutrition_facts = {};
          }
        }
      }

      return planData;
    });

    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return responseSuccess(
      res,
      200,
      'Recipes from meal plan retrieved successfully',
      {
        pagination: {
          total: count,
          page: page,
          limit: limit,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPreviousPage: hasPreviousPage,
          nextPage: hasNextPage ? page + 1 : null,
          previousPage: hasPreviousPage ? page - 1 : null,
        },
        meal_plans: formattedMealPlans,
      }
    );
  } catch (error) {
    return responseError(
      res,
      500,
      'Server error while retrieving recipes from meal plan',
      error.message
    );
  }
};
