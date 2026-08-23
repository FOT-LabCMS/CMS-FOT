"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable("disposals");
    if (!tableDefinition.supervisor_name) {
      await queryInterface.addColumn("disposals", "supervisor_name", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable("disposals");
    if (tableDefinition.supervisor_name) {
      await queryInterface.removeColumn("disposals", "supervisor_name");
    }
  },
};
