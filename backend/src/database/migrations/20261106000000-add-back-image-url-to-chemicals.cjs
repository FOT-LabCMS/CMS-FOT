"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("chemicals");

    if (!table.back_image_url) {
      await queryInterface.addColumn("chemicals", "back_image_url", {
        type: Sequelize.STRING(1024),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("chemicals");

    if (table.back_image_url) {
      await queryInterface.removeColumn("chemicals", "back_image_url");
    }
  },
};
