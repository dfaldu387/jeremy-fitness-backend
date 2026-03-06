const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecipeHistory = sequelize.define('RecipeHistory', {
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
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    dish_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    servings: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    prep_time_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    cook_time_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    total_time_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    ingredients: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    cooking_steps_instructions: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    nutrition_facts: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    is_favorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    recipe_type: {
        type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snack'),
        allowNull: false,
    }
}, {
    tableName: 'recipe_history',
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
    freezeTableName: true,
    indexes: [
        {
            fields: ['user_id', 'date']
        },
        {
            fields: ['user_id']
        },
        {
            fields: ['date']
        },
        {
            fields: ['dish_name']
        },
        {
            fields: ['user_id', 'is_favorite']
        }
    ]
});

module.exports = RecipeHistory;
