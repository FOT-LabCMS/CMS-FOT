'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // For quickly fetching logs for a specific user, sorted by date.
      await queryInterface.addIndex('audit_logs', ['user_id', 'created_at'], {
        name: 'audit_logs_user_id_created_at_idx',
        transaction,
      });

      // For filtering by action type, sorted by date.
      await queryInterface.addIndex('audit_logs', ['action_type', 'created_at'], {
        name: 'audit_logs_action_type_created_at_idx',
        transaction,
      });

      // For finding the history of a specific entity (e.g., a Chemical or User).
      await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id'], {
        name: 'audit_logs_entity_type_entity_id_idx',
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('audit_logs', 'audit_logs_user_id_created_at_idx');
    await queryInterface.removeIndex('audit_logs', 'audit_logs_action_type_created_at_idx');
    await queryInterface.removeIndex('audit_logs', 'audit_logs_entity_type_entity_id_idx');
  }
};