const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user.model');

const PrivacyPolicy = sequelize.define('PrivacyPolicy', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  healthAndWellnessDisclaimer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  AITransparency: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  dataAndPrivacy: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  digitalRewardsAndCollectibles: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  termsAndConsentTermsAndConditions: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  termsAndConsentPrivacyPolicy: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  termsAndConsentCookiePolicy: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  termsAndConsentRiskDisclosure: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'privacy_policies',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date',
});

module.exports = PrivacyPolicy;
