'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const adminId = process.env.ADMIN_INSTITUTIONAL_ID || 'R000001';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@flcms.com';

    // Check if the admin user already exists to make the seeder idempotent
    const [existingUser] = await queryInterface.sequelize.query(
      `SELECT id FROM "users" WHERE institutional_id = :institutional_id`,
      {
        replacements: { institutional_id: adminId },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (existingUser) {
      console.log(`Admin user with institutional ID ${adminId} already exists. Skipping.`);
      return;
    }

    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);

    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        institutional_id: adminId,
        full_name: process.env.ADMIN_FULL_NAME || 'Default Admin',
        email: adminEmail,
        password_hash: passwordHash,
        role: 'ADMIN',
        auth_source: 'LOCAL',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ], {});
  },

  async down(queryInterface, Sequelize) {
    const adminId = process.env.ADMIN_INSTITUTIONAL_ID || 'R000001';
    await queryInterface.bulkDelete('users', { institutional_id: adminId }, {});
  }
};