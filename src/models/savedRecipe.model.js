const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { User } = require('./associations');

const SavedRecipe = sequelize.define('SavedRecipe', {
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
    instructions: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    nutrition_facts: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    dietary_preferences: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    is_preferred: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    }
}, {
    tableName: 'saved_recipes',
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
    indexes: [
        {
            fields: ['user_id', 'date']
        },
        {
            fields: ['user_id', 'is_preferred']
        }
    ]
});

module.exports = SavedRecipe;
