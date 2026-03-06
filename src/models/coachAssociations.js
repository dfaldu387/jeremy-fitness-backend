const User = require('./user.model');
const CoachConversation = require('./coachConversation.model');
const CoachMessage = require('./coachMessage.model');
const FavoriteMessage = require('./favoriteMessage.model');
const UserLevel = require('./userLevel.model');
const WellnessPoints = require('./wellnessPoints.model');

// Coach Conversation associations
User.hasMany(CoachConversation, { foreignKey: 'user_id', as: 'coachConversations', onDelete: 'CASCADE' });
CoachConversation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Coach Message associations
CoachConversation.hasMany(CoachMessage, { foreignKey: 'conversation_id', as: 'messages', onDelete: 'CASCADE' });
CoachMessage.belongsTo(CoachConversation, { foreignKey: 'conversation_id', as: 'conversation' });
User.hasMany(CoachMessage, { foreignKey: 'user_id', as: 'coachMessages', onDelete: 'CASCADE' });
CoachMessage.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Favorite Message associations
User.hasMany(FavoriteMessage, { foreignKey: 'user_id', as: 'favoriteMessages', onDelete: 'CASCADE' });
FavoriteMessage.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
CoachMessage.hasMany(FavoriteMessage, { foreignKey: 'message_id', as: 'favorites', onDelete: 'CASCADE' });
FavoriteMessage.belongsTo(CoachMessage, { foreignKey: 'message_id', as: 'message' });
CoachConversation.hasMany(FavoriteMessage, { foreignKey: 'conversation_id', as: 'favorites', onDelete: 'CASCADE' });
FavoriteMessage.belongsTo(CoachConversation, { foreignKey: 'conversation_id', as: 'conversation' });

// User Level associations
User.hasOne(UserLevel, { foreignKey: 'user_id', as: 'userLevel', onDelete: 'CASCADE' });
UserLevel.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Wellness Points associations
User.hasMany(WellnessPoints, { foreignKey: 'user_id', as: 'wellnessPoints', onDelete: 'CASCADE' });
WellnessPoints.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
    User,
    CoachConversation,
    CoachMessage,
    FavoriteMessage,
    UserLevel,
    WellnessPoints,
};
