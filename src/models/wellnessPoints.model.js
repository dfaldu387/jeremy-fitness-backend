const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WellnessPoints = sequelize.define('WellnessPoints', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    action_type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    action_description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    reference_type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    coach_type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    multiplier: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 1.00,
    },
    final_points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'wellness_points',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = WellnessPoints;
