const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { User } = require('./associations');

const MealPlanner = sequelize.define('MealPlanner', {
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
    food_restrictions: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    food_allergies: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    food_preferences: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    nutrition_goals: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
}, {
    tableName: 'meal_planner',
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
});

module.exports = MealPlanner;
