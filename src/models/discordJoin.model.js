const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DiscordJoin = sequelize.define('DiscordJoin', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    discord_user_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    invite_code: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    joined_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'discord_joins',
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
    freezeTableName: true
});

module.exports = DiscordJoin;
