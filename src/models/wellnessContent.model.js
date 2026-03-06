const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WellnessContent = sequelize.define('WellnessContent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('wellness'),
        allowNull: false,
        defaultValue: 'wellness',
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
    podcast_link: {
        type: DataTypes.STRING(255),
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
    tableName: 'wellness_content',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
    freezeTableName: true
});

WellnessContent.beforeUpdate((instance, options) => {
    instance.updated_date = new Date();
});

module.exports = WellnessContent;
