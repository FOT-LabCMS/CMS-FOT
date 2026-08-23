"use strict";

const HAZARD_CATEGORY_ENUM = "enum_chemicals_hazard_category";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("chemicals");

    if (!table.hazard_category) {
      await queryInterface.addColumn("chemicals", "hazard_category", {
        type: Sequelize.ENUM(
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
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("chemicals");

    if (table.hazard_category) {
      await queryInterface.removeColumn("chemicals", "hazard_category");
    }

    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${HAZARD_CATEGORY_ENUM}";`);
  },
};
