const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Exercise = sequelize.define('Exercise', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  activity_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  exercise_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hr: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Heart Rate in bpm'
  },
  zone: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Heart Rate Zone (1-5)'
  },
  zone_label: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Zone label e.g. Aerobic, Anaerobic'
  },
  pace: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Pace e.g. 5:42 min/km'
  },
  cadence: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Cadence in spm'
  },
  power: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Power in watts'
  },
  elevation: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Elevation in meters'
  },
  time: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Start time of exercise e.g. 7:45 AM'
  },
  duration: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Duration e.g. 40:12'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Auto-set to current date when exercise is created'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Location of exercise'
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'completed'),
    defaultValue: 'active',
  },
}, {
  tableName: 'exercises',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

Exercise.beforeUpdate((instance, options) => {
  instance.updated_date = new Date();
});

module.exports = Exercise;
