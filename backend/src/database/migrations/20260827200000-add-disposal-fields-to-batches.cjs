'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('batches');

    if (!tableInfo.is_disposed) {
      await queryInterface.addColumn('batches', 'is_disposed', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    if (!tableInfo.disposal_remark) {
      await queryInterface.addColumn('batches', 'disposal_remark', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableInfo.disposed_at) {
      await queryInterface.addColumn('batches', 'disposed_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('batches');

    if (tableInfo.is_disposed) {
      await queryInterface.removeColumn('batches', 'is_disposed');
    }
    if (tableInfo.disposal_remark) {
      await queryInterface.removeColumn('batches', 'disposal_remark');
    }
    if (tableInfo.disposed_at) {
      await queryInterface.removeColumn('batches', 'disposed_at');
    }
  },
};
