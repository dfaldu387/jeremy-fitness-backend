const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FitnessPlanWorkout = sequelize.define('FitnessPlanWorkout', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  fitness_plan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'fitness_plans',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  day: {
    type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
    allowNull: false,
  },
  workout_title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  workout_description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  workout_data: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  week_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  is_favorite: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'fitness_plan_workouts',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

FitnessPlanWorkout.beforeUpdate((instance, options) => {
  instance.updated_date = new Date();
});

module.exports = FitnessPlanWorkout;
