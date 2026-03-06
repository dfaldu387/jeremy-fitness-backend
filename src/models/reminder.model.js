const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reminder = sequelize.define('Reminder', {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  hai_reminder: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  coaching_reminder: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  s11_reminder: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  drink_reminder: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  stand_reminder: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sleep_reminder: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reminder_time: {
    type: DataTypes.STRING,
    allowNull: true
  },
  frequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
    defaultValue: 'daily'
  }
}, {
  tableName: 'reminder',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

Reminder.beforeUpdate((instance, options) => {
  instance.updated_date = new Date();
});

module.exports = Reminder;
