const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController.js');
const verifyToken = require('../middlewares/Authmiddleware.js');

// Protect all notification routes. Only logged-in users can access them.
router.use(verifyToken);

// GET /api/notifications - Fetch notifications for the current user (supports pagination)
// Example: /api/notifications?filter=unread&page=1&limit=10
router.get('/', NotificationController.getNotifications);

// GET /api/notifications/count - Get the count of unread notifications
router.get('/count', NotificationController.getUnreadCount);

// PATCH /api/notifications/:id/read - Mark a specific notification as read
router.patch('/:id/read', NotificationController.markAsRead);

// POST /api/notifications/read-all - Mark all of the user's notifications as read
router.post('/read-all', NotificationController.markAllAsRead);

module.exports = router;