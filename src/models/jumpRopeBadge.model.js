const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JumpRopeBadge = sequelize.define('JumpRopeBadge', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  badge_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  earned_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
}, {
  tableName: 'jump_rope_badges',
  timestamps: true,
  createdAt: 'created_date',
  updatedAt: 'updated_date',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'badge_key']
    }
  ]
});

JumpRopeBadge.beforeUpdate((instance) => {
  instance.updated_date = new Date();
});

module.exports = JumpRopeBadge;
