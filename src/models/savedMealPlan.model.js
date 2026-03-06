const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { User } = require('./associations');

const SavedMealPlan = sequelize.define('SavedMealPlan', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    meal_planner_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    header: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    goal_section: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    daily_calories: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    fitness_section: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    meal_plan_overview: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    daily_flow: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    actions: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    user_preferences: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    }
}, {
    tableName: 'saved_meal_plans',
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
});

module.exports = SavedMealPlan;
