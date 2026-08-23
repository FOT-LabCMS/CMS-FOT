const { Notification } = require('../models');

/**
 * Get notifications for the currently logged-in user.
 * Supports pagination and filtering by read status.
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 15, filter = 'all' } = req.query; // filter can be 'all' or 'unread'

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = { userId };

    if (filter === 'unread') {
      where.isRead = false;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page, 10),
      },
    });
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
};