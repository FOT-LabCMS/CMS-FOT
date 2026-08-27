"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("chemicals");

    if (!table.bin_card_number) {
      // 1. Add column as nullable first to safely accommodate existing records
      await queryInterface.addColumn("chemicals", "bin_card_number", {
        type: Sequelize.STRING(6),
        allowNull: true,
      });

      // 2. Safely populate existing records with unique sequential BST### numbers
      await queryInterface.sequelize.query(`
        WITH numbered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
          FROM chemicals
          WHERE bin_card_number IS NULL
        )
        UPDATE chemicals
        SET bin_card_number = 'BST' || LPAD(numbered.rn::text, 3, '0')
        FROM numbered
        WHERE chemicals.id = numbered.id;
      `);

      // 3. Set column to NOT NULL
      await queryInterface.changeColumn("chemicals", "bin_card_number", {
        type: Sequelize.STRING(6),
        allowNull: false,
      });

      // 4. Add unique constraint on bin_card_number
      await queryInterface.addConstraint("chemicals", {
        fields: ["bin_card_number"],
        type: "unique",
        name: "chemicals_bin_card_number_unique",
      });
    }

    if (!table.image_url) {
      await queryInterface.addColumn("chemicals", "image_url", {
        type: Sequelize.STRING(1024),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("chemicals");

    if (table.bin_card_number) {
      try {
        await queryInterface.removeConstraint("chemicals", "chemicals_bin_card_number_unique");
      } catch {
        // ignore if constraint does not exist
      }
      await queryInterface.removeColumn("chemicals", "bin_card_number");
    }

    if (table.image_url) {
      await queryInterface.removeColumn("chemicals", "image_url");
    }
  },
};

