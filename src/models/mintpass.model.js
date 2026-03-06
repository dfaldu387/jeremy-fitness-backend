const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserMintPass = sequelize.define('UserMintPass', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    legendmp_code: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    verified: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'user_mintpass',
    timestamps: true,
    createdAt: 'created_date',
    updatedAt: 'updated_date',
    freezeTableName: true,
    indexes: [
        { unique: true, fields: ['legendmp_code'], name: 'ux_legendmp_code' }
    ]
});


module.exports = UserMintPass;
