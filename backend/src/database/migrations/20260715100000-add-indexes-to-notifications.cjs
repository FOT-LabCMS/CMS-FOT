'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // For quickly fetching a user's notifications, filtered by read status, and sorted by date.
      // This is the primary index for the NotificationsPage.
      await queryInterface.addIndex('notifications', ['user_id', 'is_read', 'created_at'], {
        name: 'notifications_user_id_is_read_created_at_idx',
        transaction,
      });

      // For internal checks, e.g., finding if a specific notification already exists for an entity.
      await queryInterface.addIndex('notifications', ['entity_type', 'entity_id'], {
        name: 'notifications_entity_type_entity_id_idx',
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('notifications', 'notifications_user_id_is_read_created_at_idx');
    await queryInterface.removeIndex('notifications', 'notifications_entity_type_entity_id_idx');
  }
};