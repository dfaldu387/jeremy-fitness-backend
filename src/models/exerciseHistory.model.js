const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExerciseHistory = sequelize.define('ExerciseHistory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  exercise_type: {
    type: DataTypes.ENUM('outdoor_run', 'indoor_run', 'outdoor_cycling', 'indoor_cycling', 'walking', 'inteli_rope', 'resistance_training', 'hiit_workout', 'yoga_flow', 'mobility_stretching'),
    allowNull: false,
  },
  exercise_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  calories: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  distance_km: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  pace_per_km: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  avg_speed_kmh: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  total_exercises: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  total_load_kg: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  total_poses: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  intensity: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: true,
  },
  steps: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  map_thumbnail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  route_coordinates: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  exercise_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  // Workout Targets
  target_time_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  target_distance_km: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  target_calories: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  target_hr_zone: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Heart Rate Data
  avg_heart_rate: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  max_heart_rate: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  min_heart_rate: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  heart_rate_data: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // HR Zones
  hr_zones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // HR Recovery
  hr_recovery_1min: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  hr_recovery_2min: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Performance Metrics
  avg_cadence: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  avg_power: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  elevation_gain: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  elevation_data: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Training Load & Effort
  training_load: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  rpe_rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Workout Status
  status: {
    type: DataTypes.ENUM('active', 'paused', 'completed'),
    allowNull: true,
    defaultValue: 'completed',
  },
}, {
  tableName: 'exercise_history',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

ExerciseHistory.beforeUpdate((instance) => {
  instance.updated_date = new Date();
});

module.exports = ExerciseHistory;
