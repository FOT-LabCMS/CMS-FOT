const { DataTypes } = require("sequelize");

module.exports = function InstrumentModel(sequelize) {
  const Instrument = sequelize.define(
    "Instrument",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "name",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "description",
      },
      imageUrl: {
        type: DataTypes.STRING(1024),
        allowNull: true,
        field: "image_url",
      },
      availability: {
        type: DataTypes.ENUM("AVAILABLE", "UNAVAILABLE", "UNDER_MAINTENANCE"),
        allowNull: false,
        defaultValue: "AVAILABLE",
        field: "availability",
      },
      tutorialVideo: {
        type: DataTypes.STRING(1024),
        allowNull: true,
        field: "tutorial_video",
      },
      warranty: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "warranty",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
      },
    },
    {
      tableName: "instruments",
      timestamps: true,
      underscored: true,
    },
  );

  return Instrument;
};
