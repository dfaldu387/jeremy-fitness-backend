const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MembershipContent = sequelize.define("MembershipContent", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    features: {
        type: DataTypes.STRING(1000),
        allowNull: true
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    planType: {
        type: DataTypes.ENUM("monthly", "yearly"),
        allowNull: false
    },
    stripeProductId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    is_active: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
    },
}, {
    tableName: "membership_contents",
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
    freezeTableName: true
});

module.exports = MembershipContent;
