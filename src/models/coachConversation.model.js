const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CoachConversation = sequelize.define('CoachConversation', {
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
    coach_type: {
        type: DataTypes.ENUM('nutrition', 'fitness', 'mental_health', 'hai'),
        allowNull: false,
        defaultValue: 'nutrition',
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    token_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 25000,
    },
    tokens_used: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'coach_conversations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = CoachConversation;
