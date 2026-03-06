const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FoodEntry = sequelize.define('FoodEntry', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    food_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    food_type: {
        type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snack'),
        allowNull: false
    },
    food_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    total_weight_grams: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: null
    },
    water_content_ml: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: null
    },
    food_image: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
    food_entry_source: {
        type: DataTypes.ENUM('manual', 'imageUpload', 'AI', 'imageUploadAccurate'),
        allowNull: true,
        defaultValue: null,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'food_entry',
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
    freezeTableName: true,
});

module.exports = FoodEntry;