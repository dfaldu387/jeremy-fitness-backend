const User = require('./user.model');
const Referral = require('./referral.model');
const Notification = require('./notification.model');
const Reminder = require('./reminder.model');
const ProfileSetting = require('./profileSetting.model');
const GroceryItem = require('./groceriesItem.model');
const FoodEntry = require('./foodEntry.model');
const NutritionalInfo = require('./nutritionalInfo.model');
const FoodIngredient = require('./foodIngredient.model');
const MealPlanner = require('./mealPlanner.model');
const SavedMealPlan = require('./savedMealPlan.model');
const SavedRecipe = require('./savedRecipe.model');
const Conversation = require('./conversation.model');
const PrivacyPolicy = require('./privacyPolicy.model');
const WorkoutGenerator = require('./workoutGenerator.model');
const ExerciseHistory = require('./exerciseHistory.model');
const JumpRopeSession = require('./jumpRopeSession.model');
const JumpRopeGoal = require('./jumpRopeGoal.model');
const JumpRopeBadge = require('./jumpRopeBadge.model');
const FitnessPlan = require('./fitnessPlan.model');
const FitnessPlanWorkout = require('./fitnessPlanWorkout.model');
const ActivityType = require('./activityType.model');
const Exercise = require('./exercise.model');

// Notifications
User.hasOne(Notification, { foreignKey: 'user_id', as: 'notification' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Profile settings
User.hasOne(ProfileSetting, { foreignKey: 'userId', as: 'profileSettings', onDelete: 'CASCADE' });
ProfileSetting.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User Consent (foreign key managed at database level)
User.hasOne(PrivacyPolicy, { foreignKey: 'user_id', as: 'PrivacyPolicy', constraints: false });
PrivacyPolicy.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

// Referrals
User.hasMany(Referral, { foreignKey: 'referrer_id', as: 'referralsSent' });
User.hasMany(Referral, { foreignKey: 'referee_id', as: 'referralsReceived' });

Referral.belongsTo(User, { foreignKey: 'referrer_id', as: 'referrer' });
Referral.belongsTo(User, { foreignKey: 'referee_id', as: 'referee' });

// Reminder associations
User.hasOne(Reminder, { foreignKey: 'user_id', as: 'reminder' });
Reminder.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

FoodEntry.hasMany(NutritionalInfo, { foreignKey: 'food_entry_id', as: 'nutritionalInfo', onDelete: 'CASCADE' });
FoodEntry.hasMany(GroceryItem, { foreignKey: 'food_entry_id', as: 'groceryItems', onDelete: 'CASCADE' });
FoodEntry.hasMany(FoodIngredient, { foreignKey: 'food_entry_id', as: 'foodIngredients', onDelete: 'CASCADE' });

NutritionalInfo.belongsTo(FoodEntry, { foreignKey: 'food_entry_id', as: 'foodEntry' });
GroceryItem.belongsTo(FoodEntry, { foreignKey: 'food_entry_id', as: 'foodEntry' });
FoodIngredient.belongsTo(FoodEntry, { foreignKey: 'food_entry_id', as: 'foodEntry' });

// Meal Planner associations
User.hasMany(MealPlanner, { foreignKey: 'user_id', as: 'mealPlanners', onDelete: 'CASCADE' });
MealPlanner.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Saved Meal Plan associations
User.hasMany(SavedMealPlan, { foreignKey: 'user_id', as: 'savedMealPlans', onDelete: 'CASCADE' });
SavedMealPlan.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Saved Recipe associations
User.hasMany(SavedRecipe, { foreignKey: 'user_id', as: 'savedRecipes', onDelete: 'CASCADE' });
SavedRecipe.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Conversation associations
User.hasMany(Conversation, { foreignKey: 'user_id', as: 'conversations', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Workout Generator associations
User.hasMany(WorkoutGenerator, { foreignKey: 'user_id', as: 'workoutGenerators', onDelete: 'CASCADE' });
WorkoutGenerator.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Exercise History associations
User.hasMany(ExerciseHistory, { foreignKey: 'user_id', as: 'exerciseHistory', onDelete: 'CASCADE' });
ExerciseHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Jump Rope associations
User.hasMany(JumpRopeSession, { foreignKey: 'user_id', as: 'jumpRopeSessions', onDelete: 'CASCADE' });
JumpRopeSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(JumpRopeGoal, { foreignKey: 'user_id', as: 'jumpRopeGoals', onDelete: 'CASCADE' });
JumpRopeGoal.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(JumpRopeBadge, { foreignKey: 'user_id', as: 'jumpRopeBadges', onDelete: 'CASCADE' });
JumpRopeBadge.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
// Fitness Plan associations
User.hasMany(FitnessPlan, { foreignKey: 'user_id', as: 'fitnessPlans', onDelete: 'CASCADE' });
FitnessPlan.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

FitnessPlan.hasMany(FitnessPlanWorkout, { foreignKey: 'fitness_plan_id', as: 'workouts', onDelete: 'CASCADE' });
FitnessPlanWorkout.belongsTo(FitnessPlan, { foreignKey: 'fitness_plan_id', as: 'fitnessPlan' });

User.hasMany(FitnessPlanWorkout, { foreignKey: 'user_id', as: 'fitnessPlanWorkouts', onDelete: 'CASCADE' });
FitnessPlanWorkout.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Exercise associations
User.hasMany(Exercise, { foreignKey: 'user_id', as: 'exercises', onDelete: 'CASCADE' });
Exercise.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ActivityType.hasMany(Exercise, { foreignKey: 'activity_type_id', as: 'exercises' });
Exercise.belongsTo(ActivityType, { foreignKey: 'activity_type_id', as: 'activityType' });

module.exports = {
    User,
    Referral,
    Notification,
    Reminder,
    ProfileSetting,
    FoodEntry,
    NutritionalInfo,
    GroceryItem,
    FoodIngredient,
    MealPlanner,
    SavedMealPlan,
    SavedRecipe,
    Conversation,
    PrivacyPolicy,
    WorkoutGenerator,
    ExerciseHistory,
    JumpRopeSession,
    JumpRopeGoal,
    JumpRopeBadge,
    FitnessPlan,
    FitnessPlanWorkout,
    ActivityType,
    Exercise
};