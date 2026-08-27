'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('chemicals');
    if (!tableInfo.remarks) {
      await queryInterface.addColumn('chemicals', 'remarks', {
        type: Sequelize.TEXT,
        allowNull: true,
        field: "remarks",
      });
    }
  },

  async down (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('chemicals');
    if (tableInfo.remarks) {
      await queryInterface.removeColumn('chemicals', 'remarks');
    }
  }
};