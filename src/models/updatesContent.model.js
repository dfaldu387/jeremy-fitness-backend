const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UpdatesContent = sequelize.define('UpdatesContent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('update'),
        allowNull: false,
        defaultValue: 'update',
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
    },
    is_active: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
    },
    link: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null,
        validate: {
            isUrl: true,
        },
    },
}, {
    tableName: 'update_content',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
    freezeTableName: true
});

UpdatesContent.beforeUpdate((instance, options) => {
    instance.updated_date = new Date();
});

module.exports = UpdatesContent;
