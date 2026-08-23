"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("batches", "low_stock_threshold_quantity", {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE batches AS b
      SET low_stock_threshold_quantity = CASE
        WHEN c.stock_dimension = 'VOLUME' THEN 300
        WHEN c.stock_dimension = 'MASS' THEN 500
        WHEN c.stock_dimension = 'COUNT' THEN 20
        ELSE 0
      END
      FROM chemicals AS c
      WHERE b.chemical_id = c.id
    `);

    await queryInterface.sequelize.query(`
      UPDATE batches
      SET low_stock_threshold_quantity = 0
      WHERE low_stock_threshold_quantity IS NULL
    `);

    await queryInterface.changeColumn("batches", "low_stock_threshold_quantity", {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("batches", "low_stock_threshold_quantity");
  },
};
