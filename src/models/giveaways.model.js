const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Giveaways = sequelize.define('Giveaways', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sapien_eleven_followed_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    deSciJeremy_followed_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    wallet_connected_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    discord_connected_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'giveaways',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
    freezeTableName: true
});

module.exports = Giveaways;
