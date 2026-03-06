const { WellnessPoint, UserWellnessSummary } = require('../../../models/associations');
const { Op } = require('sequelize');
const sequelize = require('../../../config/database');

const WP_VALUES = {
  RECIPE_GENERATED: 50,
  RECIPE_FAVORITED: 10,
  RECIPE_UNFAVORITED: -10,
  RECIPE_ADDED_TO_CALENDAR: 20,
  RECIPE_SHARED: 25,

  MEAL_PLAN_CREATED: 100,
  MEAL_PLAN_SAVED: 75,

  FOOD_LOGGED: 30,
  FOOD_IMAGE_ANALYZED: 40,
  FULL_DAY_LOGGED: 100, 

  GOAL_SET: 50,
  DAILY_GOAL_ACHIEVED: 150,
  WEEKLY_GOAL_ACHIEVED: 500,
  MONTHLY_GOAL_ACHIEVED: 2000,
  WEIGHT_GOAL_MILESTONE: 300,

  PANTRY_UPDATED: 15,
  GROCERY_LIST_CREATED: 20,

  WEIGHT_LOGGED: 20,

  STREAK_7_DAYS: 200,
  STREAK_30_DAYS: 1000,
  STREAK_100_DAYS: 5000,
};

async function awardPoints(userId, actionType, points, actionCategory = 'nutrition', referenceId = null, referenceTable = null, description = null) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const wellnessPoint = await WellnessPoint.create({
      user_id: userId,
      points: points,
      action_type: actionType,
      action_category: actionCategory,
      reference_id: referenceId,
      reference_table: referenceTable,
      description: description || `Earned ${points} WP for ${actionType}`,
      date: today,
    });

    return wellnessPoint;
  } catch (error) {
    console.error('Error awarding wellness points:', error);
    throw error;
  }
}

async function awardRecipePoints(userId, action, recipeId, recipeName = '') {
  const actionMap = {
    generated: { points: WP_VALUES.RECIPE_GENERATED, description: `Generated recipe: ${recipeName}` },
    favorited: { points: WP_VALUES.RECIPE_FAVORITED, description: `Favorited recipe: ${recipeName}` },
    unfavorited: { points: WP_VALUES.RECIPE_UNFAVORITED, description: `Unfavorited recipe: ${recipeName}` },
    added_to_calendar: { points: WP_VALUES.RECIPE_ADDED_TO_CALENDAR, description: `Added recipe to calendar: ${recipeName}` },
    shared: { points: WP_VALUES.RECIPE_SHARED, description: `Shared recipe: ${recipeName}` },
  };

  const actionData = actionMap[action];
  if (!actionData) return null;

  return await awardPoints(
    userId,
    `recipe_${action}`,
    actionData.points,
    'nutrition',
    recipeId,
    'saved_recipes',
    actionData.description
  );
}

async function awardMealPlanPoints(userId, action, mealPlanId = null) {
  const actionMap = {
    created: { points: WP_VALUES.MEAL_PLAN_CREATED, description: 'Created meal plan' },
    saved: { points: WP_VALUES.MEAL_PLAN_SAVED, description: 'Saved meal plan' },
  };

  const actionData = actionMap[action];
  if (!actionData) return null;

  return await awardPoints(
    userId,
    `meal_plan_${action}`,
    actionData.points,
    'nutrition',
    mealPlanId,
    'saved_meal_plans',
    actionData.description
  );
}

async function awardFoodLoggingPoints(userId, action, foodEntryId = null, foodName = '') {
  const actionMap = {
    logged: { points: WP_VALUES.FOOD_LOGGED, description: `Logged food: ${foodName}` },
    image_analyzed: { points: WP_VALUES.FOOD_IMAGE_ANALYZED, description: `Analyzed food image: ${foodName}` },
  };

  const actionData = actionMap[action];
  if (!actionData) return null;

  return await awardPoints(
    userId,
    `food_${action}`,
    actionData.points,
    'nutrition',
    foodEntryId,
    'food_entry',
    actionData.description
  );
}

async function checkAndAwardFullDayBonus(userId, date) {
  try {
    const { FoodEntry } = require('../../../models/associations');

    const mealTypes = await FoodEntry.findAll({
      where: {
        user_id: userId,
        date: date,
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('food_type')), 'food_type']],
    });

    const loggedMeals = mealTypes.map((m) => m.food_type);
    const hasAllMainMeals = ['breakfast', 'lunch', 'dinner'].every((meal) => loggedMeals.includes(meal));

    if (hasAllMainMeals) {
      const existingBonus = await WellnessPoint.findOne({
        where: {
          user_id: userId,
          action_type: 'full_day_logged',
          date: date,
        },
      });

      if (!existingBonus) {
        return await awardPoints(
          userId,
          'full_day_logged',
          WP_VALUES.FULL_DAY_LOGGED,
          'achievement',
          null,
          null,
          `Logged all meals for ${date}`
        );
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking full day bonus:', error);
    return null;
  }
}

async function awardGoalPoints(userId, goalType, goalId = null, description = '') {
  const actionMap = {
    set: { points: WP_VALUES.GOAL_SET, desc: 'Set nutrition goal' },
    daily_achieved: { points: WP_VALUES.DAILY_GOAL_ACHIEVED, desc: 'Achieved daily goal' },
    weekly_achieved: { points: WP_VALUES.WEEKLY_GOAL_ACHIEVED, desc: 'Achieved weekly goal' },
    monthly_achieved: { points: WP_VALUES.MONTHLY_GOAL_ACHIEVED, desc: 'Achieved monthly goal' },
    weight_milestone: { points: WP_VALUES.WEIGHT_GOAL_MILESTONE, desc: 'Reached weight milestone' },
  };

  const actionData = actionMap[goalType];
  if (!actionData) return null;

  return await awardPoints(
    userId,
    `goal_${goalType}`,
    actionData.points,
    'achievement',
    goalId,
    'nutrition_goals',
    description || actionData.desc
  );
}

async function awardPantryGroceryPoints(userId, action, itemId = null, itemName = '') {
  const actionMap = {
    pantry_updated: { points: WP_VALUES.PANTRY_UPDATED, description: `Updated pantry: ${itemName}` },
    grocery_created: { points: WP_VALUES.GROCERY_LIST_CREATED, description: 'Created grocery list' },
  };

  const actionData = actionMap[action];
  if (!actionData) return null;

  return await awardPoints(
    userId,
    action,
    actionData.points,
    'nutrition',
    itemId,
    action === 'pantry_updated' ? 'pantry_items' : 'grocery_items',
    actionData.description
  );
}

async function awardWeightLoggingPoints(userId, weightLogId, weight) {
  return await awardPoints(
    userId,
    'weight_logged',
    WP_VALUES.WEIGHT_LOGGED,
    'wellness',
    weightLogId,
    'body_weight_log',
    `Logged weight: ${weight} kg`
  );
}

async function checkAndAwardStreakBonus(userId) {
  try {
    const summary = await UserWellnessSummary.findOne({
      where: { user_id: userId },
    });

    if (!summary) return null;

    const streak = summary.current_streak_days;

    if (streak === 7) {
      return await awardPoints(userId, 'streak_7_days', WP_VALUES.STREAK_7_DAYS, 'achievement', null, null, '7-day streak achieved!');
    } else if (streak === 30) {
      return await awardPoints(userId, 'streak_30_days', WP_VALUES.STREAK_30_DAYS, 'achievement', null, null, '30-day streak achieved!');
    } else if (streak === 100) {
      return await awardPoints(userId, 'streak_100_days', WP_VALUES.STREAK_100_DAYS, 'achievement', null, null, '100-day streak achieved!');
    }

    return null;
  } catch (error) {
    console.error('Error checking streak bonus:', error);
    return null;
  }
}

async function getUserWellnessSummary(userId) {
  try {
    let summary = await UserWellnessSummary.findOne({
      where: { user_id: userId },
    });

    if (!summary) {
      summary = await UserWellnessSummary.create({
        user_id: userId,
        total_points: 0,
        last_activity_date: new Date().toISOString().split('T')[0],
      });
    }

    const level = summary.level;
    let rank = 'Beginner';
    if (level >= 50) rank = 'Expert';
    else if (level >= 25) rank = 'Advanced';
    else if (level >= 10) rank = 'Intermediate';

    if (rank !== summary.rank) {
      await summary.update({ rank });
    }

    return summary;
  } catch (error) {
    console.error('Error getting wellness summary:', error);
    throw error;
  }
}

async function getWellnessPointsHistory(userId, startDate = null, endDate = null, limit = 50) {
  try {
    const whereClause = { user_id: userId };

    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate],
      };
    }

    const points = await WellnessPoint.findAll({
      where: whereClause,
      order: [['created_date', 'DESC']],
      limit: limit,
    });

    return points;
  } catch (error) {
    console.error('Error getting wellness points history:', error);
    throw error;
  }
}

module.exports = {
  WP_VALUES,
  awardPoints,
  awardRecipePoints,
  awardMealPlanPoints,
  awardFoodLoggingPoints,
  checkAndAwardFullDayBonus,
  awardGoalPoints,
  awardPantryGroceryPoints,
  awardWeightLoggingPoints,
  checkAndAwardStreakBonus,
  getUserWellnessSummary,
  getWellnessPointsHistory,
};
