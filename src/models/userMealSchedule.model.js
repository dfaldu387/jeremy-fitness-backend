const { DataTypes } = require("sequelize");
const sequelize = require('../config/database');
const User = require("./user.model");

const MealSchedule = sequelize.define("MealSchedule", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
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
  time: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  meal: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  recipe_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  example: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  dish_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
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
  groceries: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  is_favorite: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
},
  {
    tableName: "meal_schedule",
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
    freezeTableName: true
  }
);

module.exports = MealSchedule;
