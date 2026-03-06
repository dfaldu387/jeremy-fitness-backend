const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FavoriteMessage = sequelize.define('FavoriteMessage', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    message_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'coach_messages',
            key: 'id',
        },
    },
    conversation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'coach_conversations',
            key: 'id',
        },
    },
    coach_type: {
        type: DataTypes.ENUM('nutrition', 'fitness', 'mental_health', 'hai'),
        allowNull: false,
    },
    folder_name: {
        type: DataTypes.STRING(100),
        defaultValue: 'Favorites',
    },
    note: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
}, {
    tableName: 'favorite_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = FavoriteMessage;
