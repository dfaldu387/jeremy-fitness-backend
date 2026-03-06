const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MealCalendar = sequelize.define(
  'MealCalendar',
  {
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
    },
    saved_recipe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'saved_recipes',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    meal_type: {
      type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snack'),
      allowNull: false,
    },
    servings: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    created_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_date',
    },
    updated_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_date',
    },
  },
  {
    tableName: 'meal_calendar',
    timestamps: false,
    indexes: [
      {
        name: 'idx_user_date',
        fields: ['user_id', 'date'],
      },
      {
        name: 'idx_user_date_meal',
        fields: ['user_id', 'date', 'meal_type'],
      },
      {
        name: 'idx_date',
        fields: ['date'],
      },
    ],
  }
);

module.exports = MealCalendar;
