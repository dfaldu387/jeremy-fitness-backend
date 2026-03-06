const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FoodIngredient = sequelize.define('FoodIngredient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  food_entry_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'food_entry',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  calories: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  protein_g: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  carbohydrates_g: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  fat_g: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  quantity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'food_ingredients',
  timestamps: true,
  createdAt: "created_date",
  updatedAt: "updated_date",
  freezeTableName: true,
});

module.exports = FoodIngredient;
