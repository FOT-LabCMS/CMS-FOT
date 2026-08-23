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
          WHERE enumlabel = 'EXPIRED_CHEMICAL'
            AND enumtypid = '"enum_notifications_type"'::regtype
        ) THEN
          ALTER TYPE "enum_notifications_type" ADD VALUE 'EXPIRED_CHEMICAL';
        END IF;
      END
      $$;
    `);
  },

  async down() {
    // PostgreSQL cannot safely remove enum values without recreating the type.
  },
};
