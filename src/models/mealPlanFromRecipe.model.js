const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const RecipeHistory = require('./recipeHistory.model');

const MealPlanFromRecipe = sequelize.define('MealPlanFromRecipe', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    recipe_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'recipe_history',
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    meal_type: {
        type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snack'),
        allowNull: false,
    },
    is_completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
}, {
    tableName: 'meal_plan_from_recipe',
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
    freezeTableName: true,
    indexes: [
        {
            fields: ['user_id', 'date']
        },
        {
            fields: ['user_id', 'meal_type']
        },
        {
            fields: ['recipe_id']
        },
        {
            unique: true,
            fields: ['user_id', 'date', 'meal_type', 'recipe_id']
        }
    ]
});

MealPlanFromRecipe.belongsTo(RecipeHistory, {
    foreignKey: 'recipe_id',
    as: 'recipe'
});

module.exports = MealPlanFromRecipe;
