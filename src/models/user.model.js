const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  otp: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  otpExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  isCryptoWallet: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user',
  },
  referralCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  resetPasswordToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isOtpVerifiedForReset: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  prefferedName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  wellnessGoals: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contentDeliveryPreference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  birthdate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  gender: {
    type: DataTypes.ENUM("Male", "Female", "NonBinary", "PreferNotToSay"),
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dailyActivityLevel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  workoutEnvironmentPreference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  movementPreference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  height: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  weight: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  wellnessConsiderations: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  allergiesAndSensitivities: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nutritionStyle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dietaryPreference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sleepPreference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  notificationPreferences: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date',
  indexes: [
    {
      unique: true,
      fields: ['email'],
    }
  ],
});

User.beforeUpdate((instance, options) => {
  instance.updated_date = new Date();
});

User.beforeCreate(user => {
  if (!user.referralCode) user.referralCode = 'REF' + uuidv4().slice(0, 6).toUpperCase();
});

module.exports = User;
