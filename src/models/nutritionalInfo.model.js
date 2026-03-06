const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NutritionalInfo = sequelize.define('NutritionalInfo', {
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
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  nutrient_name: {
    type: DataTypes.STRING,
  },
  amount: {
    type: DataTypes.FLOAT,
  },
  unit: {
    type: DataTypes.STRING,
  },
  daily_value_percent: {
    type: DataTypes.FLOAT,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'nutritional_info',
  timestamps: true,
  createdAt: "created_date",
  updatedAt: "updated_date",
  freezeTableName: true,
});

module.exports = NutritionalInfo;
