const { DataTypes } = require("sequelize");

module.exports = function ChemicalModel(sequelize) {
  const Chemical = sequelize.define(
    "Chemical",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      chemicalCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: "chemical_code",
      },
      canonicalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "canonical_name",
      },
      stockDimension: {
        type: DataTypes.ENUM("MASS", "VOLUME", "COUNT"),
        allowNull: false,
        field: "stock_dimension",
      },
      baseUnit: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "base_unit",
      },
      casNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "cas_number",
      },
      formula: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "formula",
      },
      physicalState: {
        type: DataTypes.ENUM("SOLID", "LIQUID", "GAS", "OTHER"),
        allowNull: true,
        field: "physical_state",
      },
      hazardCategory: {
        type: DataTypes.ENUM(
          "FLAMMABLE",
          "CORROSIVE",
          "TOXIC",
          "OXIDIZER",
          "EXPLOSIVE",
          "IRRITANT",
          "ENVIRONMENTAL",
          "COMPRESSED_GAS",
          "HEALTH_HAZARD",
          "NONE",
          "OTHER",
        ),
        allowNull: true,
        field: "hazard_category",
      },
      synonyms: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      densityValue: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        field: "density_value",
      },
      densityUnit: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: "density_unit",
      },
      safetySummary: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "safety_summary",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
      },
      // --- SDS Fields ---
      sdsStorageKey: {
        type: DataTypes.STRING(512),
        allowNull: true,
        field: "sds_storage_key",
      },
      sdsOriginalFilename: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "sds_original_filename",
      },
      sdsMimeType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "sds_mime_type",
      },
      sdsFileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "sds_file_size",
      },
      sdsChecksum: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: "sds_checksum",
      },
      sdsRevisionDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "sds_revision_date",
      },
      sdsUploadedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "sds_uploaded_at",
      },
      sdsUploadedById: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "sds_uploaded_by_id",
      },
    },
    {
      tableName: "chemicals",
      timestamps: true,
      underscored: true,
    },
  );

  return Chemical;
};
