const { DataTypes } = require("sequelize");

module.exports = function LocationModel(sequelize) {
  const Location = sequelize.define(
    "Location",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: { type: DataTypes.STRING(100), allowNull: false },
      type: {
        type: DataTypes.ENUM("LAB", "ROOM", "CABINET", "SHELF", "FRIDGE", "OTHER"),
        allowNull: false,
      },
      parentLocationId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "parent_location_id",
      },
    },
    { tableName: "locations", timestamps: true, underscored: true },
  );

  return Location;
}
