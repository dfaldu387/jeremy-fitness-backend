const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Favourite = sequelize.define("Favourite", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "userId"
    },
    itemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "itemId"
    },
    type: {
        type: DataTypes.ENUM("news", "update", "wellness"),
        allowNull: false,
        field: "type"
    },
}, {
    tableName: "favourites",
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
    freezeTableName: true,
});

Favourite.beforeUpdate((instance, options) => {
    instance.updated_date = new Date();
});

module.exports = Favourite;
