const { DataTypes } = require("sequelize");

module.exports = function (sequelize) {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      institutionalId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: "institutional_id",
      },

      fullName: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: "full_name",
      },

      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },

      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash",
      },

      role: {
        type: DataTypes.ENUM(
          "LECTURER",
          "TECHNICAL_OFFICER",
          "ADMIN",
          "COMMON",
        ),
        allowNull: false,
      },

      authSource: {
        type: DataTypes.ENUM("LOCAL", "MOODLE"),
        allowNull: false,
        defaultValue: "LOCAL",
        field: "auth_source",
      },

      externalSubject: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "external_subject",
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
      },

      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_login_at",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
    },
  );

  return User;
};
