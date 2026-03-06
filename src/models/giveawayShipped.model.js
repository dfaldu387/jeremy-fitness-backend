const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AddressInfoGivwAway = sequelize.define('address_info_giveaway', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    giveaway_product_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name_of_user: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    street_address: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    city: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    state_province: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    zip_code: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    country: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
}, {
    tableName: 'address_info_giveaway',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
    freezeTableName: true
});

module.exports = AddressInfoGivwAway;
