"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableChem = await queryInterface.describeTable("chemicals");
    const tableDisp = await queryInterface.describeTable("disposals");

    // 1. Drop foreign key constraint on disposals referencing chemicals(chemical_code) first so we can update the values without violating constraints
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE disposals DROP CONSTRAINT IF EXISTS "disposals_chemical_code_fkey";
      `);
    } catch (e) {
      console.warn("Could not drop constraint disposals_chemical_code_fkey: ", e.message);
    }

    // 2. Update existing disposal records to map chemical_code to bin_card_number values from chemicals table
    if (tableDisp.chemical_code && tableChem.chemical_code && tableChem.bin_card_number) {
      await queryInterface.sequelize.query(`
        UPDATE disposals d
        SET chemical_code = c.bin_card_number
        FROM chemicals c
        WHERE d.chemical_code = c.chemical_code;
      `);
    }

    // 3. Drop chemical_code from chemicals table
    if (tableChem.chemical_code) {
      await queryInterface.removeColumn("chemicals", "chemical_code");
    }

    // 4. Rename chemical_code to bin_card_number in disposals table (if it exists and bin_card_number doesn't exist yet)
    if (tableDisp.chemical_code && !tableDisp.bin_card_number) {
      await queryInterface.renameColumn("disposals", "chemical_code", "bin_card_number");
    }

    // 5. Add new foreign key constraint on disposals(bin_card_number) referencing chemicals(bin_card_number)
    await queryInterface.addConstraint("disposals", {
      fields: ["bin_card_number"],
      type: "foreign key",
      name: "disposals_bin_card_number_fkey",
      references: {
        table: "chemicals",
        field: "bin_card_number",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    const tableChem = await queryInterface.describeTable("chemicals");
    const tableDisp = await queryInterface.describeTable("disposals");

    if (tableDisp.bin_card_number) {
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE disposals DROP CONSTRAINT IF EXISTS "disposals_bin_card_number_fkey";
        `);
      } catch (e) {}
    }

    if (!tableChem.chemical_code) {
      await queryInterface.addColumn("chemicals", "chemical_code", {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }

    if (tableDisp.bin_card_number && !tableDisp.chemical_code) {
      await queryInterface.renameColumn("disposals", "bin_card_number", "chemical_code");
    }

    await queryInterface.addConstraint("disposals", {
      fields: ["chemical_code"],
      type: "foreign key",
      name: "disposals_chemical_code_fkey",
      references: {
        table: "chemicals",
        field: "chemical_code",
      },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
};
