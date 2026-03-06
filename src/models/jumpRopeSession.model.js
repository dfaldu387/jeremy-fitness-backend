const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JumpRopeSession = sequelize.define('JumpRopeSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  jump_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  duration_seconds: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  calories_burned: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  avg_jumps_per_minute: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  max_jumps_per_minute: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  trip_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  avg_heart_rate: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  max_heart_rate: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  jump_data: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  heart_rate_data: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  session_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  rope_device_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('completed', 'cancelled'),
    defaultValue: 'completed',
  },
}, {
  tableName: 'jump_rope_sessions',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

JumpRopeSession.beforeUpdate((instance) => {
  instance.updated_date = new Date();
});

module.exports = JumpRopeSession;
