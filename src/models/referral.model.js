const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Referral = sequelize.define('Referral', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed'),
    defaultValue: 'pending'
  },
  referrer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  referee_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'referrals',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

Referral.beforeUpdate((instance, options) => {
  instance.updated_date = new Date();
});

module.exports = Referral;
