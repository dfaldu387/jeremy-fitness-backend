const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MealCalendarGrocery = sequelize.define(
  'MealCalendarGrocery',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    meal_calendar_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'meal_calendar',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    grocery_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'grocery_items',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    created_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_date',
    },
  },
  {
    tableName: 'meal_calendar_grocery_items',
    timestamps: false,
    indexes: [
      {
        name: 'unique_calendar_grocery',
        fields: ['meal_calendar_id', 'grocery_item_id'],
        unique: true,
      },
      {
        name: 'idx_meal_calendar',
        fields: ['meal_calendar_id'],
      },
      {
        name: 'idx_grocery_item',
        fields: ['grocery_item_id'],
      },
    ],
  }
);

module.exports = MealCalendarGrocery;
