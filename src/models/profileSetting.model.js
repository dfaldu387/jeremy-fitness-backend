const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProfileSetting = sequelize.define('ProfileSetting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  updates_news: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hai_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  exercise_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  nutrition_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  coaching_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  giveaway_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lore_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  new_product_alerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hci_reminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  coaching_reminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sit_reminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  drink_water_reminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  stand_move_reminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sleep_reminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sync_iphone: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sync_apple_watch: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sync_apple_health_kit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sync_android: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sync_android_fit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sync_samsung_smart_watch: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sync_fitbit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sync_oura_ring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
}, {
  tableName: 'profileSettings',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

ProfileSetting.beforeUpdate((instance, options) => {
  instance.updated_date = new Date();
});

module.exports = ProfileSetting;
