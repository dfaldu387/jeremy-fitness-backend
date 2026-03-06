const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FitnessPlan = sequelize.define('FitnessPlan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'completed'),
    allowNull: false,
    defaultValue: 'draft'
  },
  // User input fields (all required arrays from the form)
  restrictions: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  injuries_and_pain_areas: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  training_preferences: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  fitness_goals: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  training_experience: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  available_equipment: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  time_availability: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  recovery_and_lifestyle: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  // AI-generated fields
  fitness_plan_overview: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  goal: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  weekly_training_targets: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  training_intensity_volume: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  weekly_calorie_burn: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  example_weekly_flow: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'fitness_plans',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

FitnessPlan.beforeUpdate((instance, options) => {
  instance.updated_date = new Date();
});

module.exports = FitnessPlan;
