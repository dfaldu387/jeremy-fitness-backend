const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserLevel = sequelize.define('UserLevel', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    current_level: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    total_points: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    points_to_next_level: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
    },
    current_streak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Consecutive days of app usage',
    },
    longest_streak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    last_activity_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    perks_unlocked: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of perk IDs unlocked',
    },
    badges_earned: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of badge IDs earned',
    },
    nutrition_coach_interactions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    fitness_coach_interactions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    mental_health_coach_interactions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    hai_interactions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total interactions with Health AI (HAi)',
    },
    total_messages_sent: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    total_favorites: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    total_shares: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    total_checkins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'user_levels',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = UserLevel;
