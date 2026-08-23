const { DataTypes } = require("sequelize");

module.exports = function BatchModel(sequelize) {
  const Batch = sequelize.define(
    "Batch",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      chemicalId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "chemical_id",
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "location_id",
      },
      batchNumber: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "batch_number",
      },
      quantityReceived: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        field: "quantity_received",
      },
      currentQuantity: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        field: "current_quantity",
      },
      lowStockThresholdQuantity: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        field: "low_stock_threshold_quantity",
      },
      expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "expiry_date",
      },
      receivedDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "received_date",
      },
      supplier: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: "batches", timestamps: true, underscored: true },
  );

  return Batch;
}
