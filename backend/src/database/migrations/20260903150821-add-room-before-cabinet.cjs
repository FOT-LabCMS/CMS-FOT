'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_locations_type" ADD VALUE IF NOT EXISTS 'ROOM' BEFORE 'CABINET';
    `);
  },

  async down(queryInterface, Sequelize) {
    // PostgreSQL does not support dropping a single ENUM value easily.
    // This is typically left empty, or requires recreating the ENUM type.
  }
};