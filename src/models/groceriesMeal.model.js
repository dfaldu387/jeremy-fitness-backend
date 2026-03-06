const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Groceries = sequelize.define("GroceriesFromMeal", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    meal_schedule_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    item: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    quantity: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM("active", "deleted"),
        defaultValue: "active",
    },
    grocery_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
}, {
    tableName: "groceries_from_meal",
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
    freezeTableName: true
});

module.exports = Groceries;
