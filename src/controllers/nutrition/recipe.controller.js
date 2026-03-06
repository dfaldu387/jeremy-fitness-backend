const { responseSuccess, responseError } = require('../../utils/response');
const axios = require('axios');
const RecipeHistory = require('../../models/recipeHistory.model');
const { getRecipeGenerationPrompt } = require('./helpers/ai-prompts');
const MealPlanFromRecipe = require('../../models/mealPlanFromRecipe.model');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.generateRecipeFromDishName = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(res, 401, 'Unauthorized: User ID not found in token');
    }

    const { dish_name, servings, dietary_preferences, cooking_time, date, recipe_type } = req.body;

    if (!dish_name || dish_name.trim() === '') {
      return responseError(res, 400, 'dish_name is required');
    }

    const recipeDate = date || new Date().toISOString().split('T')[0];

    if (date && isNaN(new Date(date))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const validRecipeTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!recipe_type) {
      return responseError(res, 400, 'recipe_type is required');
    }
    if (!validRecipeTypes.includes(recipe_type)) {
      return responseError(res, 400, 'Invalid recipe_type. Must be one of: breakfast, lunch, dinner, snack');
    }

    const prompt = getRecipeGenerationPrompt({ dish_name, servings, dietary_preferences, cooking_time });

    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert chef and recipe developer. Respond ONLY with valid JSON, no markdown or additional text.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2500,
        temperature: 0.7
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } }
    );

    let aiResponse = openaiResponse.data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
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
      nutrition_facts: recipeData.nutrition_facts,
      recipe_type: recipe_type
    });

    return responseSuccess(res, 200, 'Recipe generated and saved successfully', {
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
      recipe_type: savedRecipe.recipe_type,
    });
  } catch (error) {
    if (error.response?.data) {
      return responseError(res, 500, 'OpenAI API error', error.response.data);
    }
    return responseError(res, 500, 'Server error while generating recipe', error.message);
  }
};

exports.getAllRecipeHistoryByUser = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(res, 401, 'Unauthorized: User ID not found in token');
    }

    const { date } = req.query;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    if (date && isNaN(new Date(date))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const whereClause = { user_id: userId };
    if (date) whereClause.date = date;

    const { count, rows: recipes } = await RecipeHistory.findAndCountAll({
      where: whereClause,
      order: [['created_date', 'DESC']],
      limit: limit,
      offset: offset
    });

    return responseSuccess(res, 200, date ? `Recipe history for ${date} retrieved successfully` : 'Recipe history retrieved successfully', {
      total: count,
      limit: limit,
      offset: offset,
      date: date || 'all',
      recipes: recipes
    });
  } catch (error) {
    return responseError(res, 500, 'Server error while retrieving recipe history', error.message);
  }
};

exports.toggleRecipeFavorite = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(res, 401, 'Unauthorized: User ID not found in token');
    }

    const { id } = req.params;
    if (!id) {
      return responseError(res, 400, 'Recipe ID is required');
    }

    const recipe = await RecipeHistory.findOne({ where: { id: id, user_id: userId } });
    if (!recipe) {
      return responseError(res, 404, 'Recipe not found');
    }

    await recipe.update({ is_favorite: !recipe.is_favorite });

    return responseSuccess(res, 200, `Recipe ${recipe.is_favorite ? 'added to' : 'removed from'} favorites`, {
      id: recipe.id,
      dish_name: recipe.dish_name,
      is_favorite: recipe.is_favorite
    });
  } catch (error) {
    return responseError(res, 500, 'Server error while updating favorite status', error.message);
  }
};

exports.getFavoriteRecipesByUser = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(res, 401, 'Unauthorized: User ID not found in token');
    }

    const { date } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    if (date && isNaN(new Date(date))) {
      return responseError(res, 400, 'Invalid date format. Use YYYY-MM-DD');
    }

    const whereClause = { user_id: userId, is_favorite: true };
    if (date) whereClause.date = date;

    const { count, rows: recipes } = await RecipeHistory.findAndCountAll({
      where: whereClause,
      order: [['updated_date', 'DESC']],
      limit: limit,
      offset: offset
    });

    return responseSuccess(res, 200, date ? `Favorite recipes for ${date} retrieved successfully` : 'Favorite recipes retrieved successfully', {
      total: count,
      limit: limit,
      offset: offset,
      date: date || 'all',
      recipes: recipes
    });
  } catch (error) {
    return responseError(res, 500, 'Server error while retrieving favorite recipes', error.message);
  }
};

exports.deleteRecipe = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return responseError(res, 401, 'Unauthorized: User ID not found in token');
    }

    const { id } = req.params;
    const { date } = req.query;

    if (!id) {
      return responseError(res, 400, 'Recipe ID is required');
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

    const recipe = await RecipeHistory.findOne({ where: whereClause });

    if (!recipe) {
      return responseError(res, 404, 'Recipe not found or does not belong to you');
    }

    await MealPlanFromRecipe.destroy({ where: { recipe_id: id, user_id: userId } });

    await recipe.destroy();

    return responseSuccess(res, 200, 'Recipe deleted successfully', { id: id });
  } catch (error) {
    return responseError(res, 500, 'Server error while deleting recipe', error.message);
  }
};
