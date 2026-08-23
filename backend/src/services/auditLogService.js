const { AuditLog } = require('../models');

/**
 * A centralized service for creating audit log entries.
 *
 * @param {object} options - The details of the action to log.
 * @param {string} [options.userId] - The ID of the user performing the action.
 * @param {string} [options.userName] - The name of the user performing the action.
 * @param {string} options.actionType - The type of action (e.g., 'USER_LOGIN', 'CREATE_CHEMICAL').
 * @param {string} [options.entityType] - The type of the entity being affected (e.g., 'Chemical', 'User').
 * @param {string} [options.entityId] - The ID of the affected entity.
 * @param {object} [options.details] - Additional details, like before/after states.
 * @param {string} [options.ipAddress] - The IP address of the user.
 */
const logAction = async (options) => {
  try {
    await AuditLog.create({
      userId: options.userId || null,
      userName: options.userName || null,
      actionType: options.actionType,
      entityType: options.entityType || null,
      entityId: options.entityId || null,
      details: options.details || null,
      ipAddress: options.ipAddress || null,
    });
  } catch (error) {
    console.error('Failed to write to audit log:', error);
  }
};

module.exports = {
  logAction,
};