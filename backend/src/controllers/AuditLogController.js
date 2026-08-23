const { AuditLog, User, sequelize } = require('../models');
const { Op } = require('sequelize');

const getLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      actionType,
      entityType,
      userId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = {};

    if (actionType) where.actionType = actionType;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    if (search) {
      where[Op.or] = [
        { userName: { [Op.iLike]: `%${search}%` } },
        { ipAddress: { [Op.iLike]: `%${search}%` } },
        // Cast JSONB to text for a simple, albeit slow, search.
        // For high performance, a dedicated full-text search index (GIN) on this column is recommended.
        sequelize.where(sequelize.cast(sequelize.col('details'), 'text'), { [Op.iLike]: `%${search}%` })
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'role'],
        // Use LEFT JOIN to include system logs that may not have a user
        required: false, 
      }],
      limit: parseInt(limit, 10),
      offset,
      order: [[sortBy, sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
      distinct: true, // Important for correct count with includes
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching audit logs.' });
  }
};

module.exports = {
  getLogs,
};