const { AuditLog, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// In-memory page cache: key -> { data, timestamp }
const auditCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const buildCacheKey = (params) => {
  return `audit:${JSON.stringify(params)}`;
};

const getCachedPage = (key) => {
  const entry = auditCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    auditCache.delete(key);
    return null;
  }
  return entry.data;
};

const setCachedPage = (key, data) => {
  auditCache.set(key, { data, timestamp: Date.now() });
};

const clearAuditCache = () => {
  auditCache.clear();
};

const getLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      actionType,
      entityType,
      userId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const cacheKey = buildCacheKey({ page, limit, actionType, entityType, userId, search, sortBy, sortOrder });
    const cached = getCachedPage(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const where = {};

    if (actionType) where.actionType = actionType;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    if (search) {
      where[Op.or] = [
        { userName: { [Op.iLike]: `%${search}%` } },
        { ipAddress: { [Op.iLike]: `%${search}%` } },
        sequelize.where(sequelize.cast(sequelize.col('details'), 'text'), { [Op.iLike]: `%${search}%` })
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'role'],
        required: false,
      }],
      limit: limitNum,
      offset,
      order: [[sortBy, sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
      distinct: true,
    });

    const response = {
      success: true,
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    };

    setCachedPage(cacheKey, response);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching audit logs.' });
  }
};

module.exports = {
  getLogs,
  clearAuditCache,
};