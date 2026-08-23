const { DataTypes } = require("sequelize");

module.exports = function AuditLogModel(sequelize) {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true, // Allow system-generated logs without a user
        field: "user_id",
      },
      userName: {
        type: DataTypes.STRING(150),
        allowNull: true, // For system actions or when user name is not available
        field: "user_name",
      },
      actionType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "action_type",
        comment: "e.g., CREATE_USER, UPDATE_CHEMICAL, LOGIN_SUCCESS",
      },
      entityType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "entity_type",
        comment: "The model name of the affected entity, e.g., 'Chemical'",
      },
      entityId: {
        type: DataTypes.STRING(255), // Use STRING to accommodate different ID types (UUID, etc.)
        allowNull: true,
        field: "entity_id",
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Stores before and after states of the entity, or other metadata",
      },
      ipAddress: {
        type: DataTypes.STRING(45), // Accommodates IPv4 and IPv6
        allowNull: true,
        field: "ip_address",
      },
    },
    {
      tableName: "audit_logs",
      timestamps: true,
      updatedAt: false, // Audit logs are immutable, so we only need createdAt
      underscored: true,
      comment: "Table to store user and system activity logs",
    }
  );

  return AuditLog;
};