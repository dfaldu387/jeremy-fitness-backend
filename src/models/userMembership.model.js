const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./user.model");
const MembershipContent = require("./membershipContent.model");

const UserMembership = sequelize.define("UserMembership", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    membership_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    payment_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    payment_amount: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    payment_status: {
        type: DataTypes.ENUM("pending", "completed", "failed"),
        defaultValue: "pending"
    },
    planType: {
        type: DataTypes.ENUM("monthly", "yearly"),
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: "user_memberships",
    timestamps: true,
    createdAt: "created_date",
    updatedAt: "updated_date",
    freezeTableName: true
});

UserMembership.beforeUpdate((instance, options) => {
    instance.updated_date = new Date();
});

UserMembership.belongsTo(User, { foreignKey: "user_id", onDelete: "CASCADE", onUpdate: "CASCADE" });
UserMembership.belongsTo(MembershipContent, { foreignKey: "membership_id" });

module.exports = UserMembership;
