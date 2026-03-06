const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GiveawayProducts = sequelize.define('GiveawayProducts', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    image_url: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    created_date: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    tableName: 'giveaway_products',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
    freezeTableName: true
});

module.exports = GiveawayProducts;
