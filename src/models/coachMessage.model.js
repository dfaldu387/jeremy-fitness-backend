const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CoachMessage = sequelize.define('CoachMessage', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    conversation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'coach_conversations',
            key: 'id',
        },
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    role: {
        type: DataTypes.ENUM('user', 'nutritionCoach', 'fitnessCoach', 'mentalHealthCoach', 'hai'),
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    coach_type: {
        type: DataTypes.ENUM('nutrition', 'fitness', 'mental_health', 'hai'),
        allowNull: false,
        defaultValue: 'nutrition',
    },
    has_tool_recommendation: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    tool_recommendation: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    has_coach_referral: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    referred_coaches: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    is_edited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    edited_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    original_content: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    includes_disclaimer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'coach_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = CoachMessage;
