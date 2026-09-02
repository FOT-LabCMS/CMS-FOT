const { Notification } = require('../models');

// In-memory per-user page cache: key -> { data, timestamp }
const notificationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const buildCacheKey = (userId, params) => {
  return `notification:${userId}:${JSON.stringify(params)}`;
};

const getCachedPage = (key) => {
  const entry = notificationCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    notificationCache.delete(key);
    return null;
  }
  return entry.data;
};

const setCachedPage = (key, data) => {
  notificationCache.set(key, { data, timestamp: Date.now() });
};

const clearNotificationCache = () => {
  notificationCache.clear();
};

/**
 * Get notifications for the currently logged-in user.
 * Supports pagination and filtering by read status.
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, filter = 'all' } = req.query; // filter can be 'all' or 'unread'

    const cacheKey = buildCacheKey(userId, { page, limit, filter });
    const cached = getCachedPage(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const where = { userId };

    if (filter === 'unread') {
      where.isRead = false;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
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
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching notifications.' });
  }
};

/**
 * Get the count of unread notifications for the logged-in user.
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * Mark a single notification as read.
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found or you do not have permission to modify it.' });
    }

    notification.isRead = true;
    await notification.save();

    clearNotificationCache();

    res.status(200).json({ success: true, message: 'Notification marked as read.', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * Mark all of the user's unread notifications as read.
 */
const markAllAsRead = async (req, res) => {
  try {
    const [affectedCount] = await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });

    clearNotificationCache();

    res.status(200).json({ success: true, message: `${affectedCount} notifications marked as read.` });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearNotificationCache,
};