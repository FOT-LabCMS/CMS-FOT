const { DataTypes } = require("sequelize");

module.exports = function NotificationModel(sequelize) {
  const Notification = sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      // The user who RECEIVES this notification
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
        comment: "The ID of the user who this notification is for.",
      },
      // The type of notification for filtering and icons
      type: {
        type: DataTypes.ENUM(
          'LOW_STOCK',
          'EXPIRY_ALERT',
          'EXPIRED_CHEMICAL',
          'NEW_USER_ADDED',
          'NEW_CHEMICAL_ADDED',
          'SDS_UPDATED',
          'NEW_BATCH_ADDED',
          'GENERIC_INFO' // Fallback type
        ),
        allowNull: false,
      },
      // Severity for UI styling (e.g., color coding)
      severity: {
        type: DataTypes.ENUM('INFO', 'WARNING', 'CRITICAL'),
        allowNull: false,
        defaultValue: 'INFO',
      },
      // The pre-rendered, personalized message for the user
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // Read status is per-user, per-notification record
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_read",
      },
      // Optional: Link to the related entity (e.g., a specific Chemical or Batch)
      entityType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "entity_type",
      },
      entityId: {
        type: DataTypes.UUID, // Assuming most IDs are UUIDs
        allowNull: true,
        field: "entity_id",
      },
    },
    {
      tableName: "notifications",
      timestamps: true,
      underscored: true,
      comment: "Stores individual notifications for each user.",
    }
  );

  return Notification;
};
