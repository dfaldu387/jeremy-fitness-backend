const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  updates_news_podcast: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  hai_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  exercise_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  nutrition_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  coaching_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  giveaway_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lore_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  new_product: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

Notification.beforeUpdate((instance, options) => {
  instance.updated_date = new Date();
});

module.exports = Notification;