const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GroceryItem = sequelize.define('GroceryItem', {
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
  },
  name: DataTypes.STRING,
  approx_quantity_to_buy: DataTypes.STRING,
  category: DataTypes.STRING,
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'grocery_items',
  createdAt: "created_date",
  updatedAt: "updated_date",
  timestamps: true,
});

module.exports = GroceryItem;
