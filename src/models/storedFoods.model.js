const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StoredFood = sequelize.define('StoredFood', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    dish_name: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: "stored_foods",
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
    freezeTableName: true
});

module.exports = StoredFood;
