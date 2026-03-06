const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkoutGenerator = sequelize.define('WorkoutGenerator', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  generator_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  workout_type: {
    type: DataTypes.ENUM('strength_training', 'hiit_workout', 'yoga_flow', 'mobility_stretching'),
    allowNull: false,
  },
  fitness_level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: true,
  },
  workout_intensity: {
    type: DataTypes.ENUM('low', 'moderate', 'intense'),
    allowNull: true,
  },
  time: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  target_body_areas: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  equipment: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  generated_workout: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'workout_generators',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

WorkoutGenerator.beforeUpdate((instance, options) => {
  instance.updated_date = new Date();
});

module.exports = WorkoutGenerator;
