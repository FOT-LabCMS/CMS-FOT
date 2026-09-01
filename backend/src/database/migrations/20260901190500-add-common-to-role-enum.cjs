"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum
          WHERE enumlabel = 'COMMON'
            AND enumtypid = '"enum_users_role"'::regtype
        ) THEN
          ALTER TYPE "enum_users_role" ADD VALUE 'COMMON';
        END IF;
      END
      $$;
    `);
  },

  async down() {
    // PostgreSQL does not support removing values from an enum without recreating the type.
  },
};
