const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JumpRopeGoal = sequelize.define('JumpRopeGoal', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  target_sessions_per_week: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 7,
  },
  target_jumps_per_session: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  target_duration_seconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  target_calories_per_session: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'jump_rope_goals',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

JumpRopeGoal.beforeUpdate((instance) => {
  instance.updated_date = new Date();
});

module.exports = JumpRopeGoal;
