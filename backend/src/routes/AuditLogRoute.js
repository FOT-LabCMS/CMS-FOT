const express = require('express');
const router = express.Router();
const AuditLogController = require('../controllers/AuditLogController.js');
const verifyToken = require('../middlewares/Authmiddleware.js');

const isAdminOrTO = (req, res, next) => {
  if (req.user.role === 'ADMIN' || req.user.role === 'TECHNICAL_OFFICER') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden: Access is restricted to administrators and technical officers.' });
};

// GET /api/audit-logs - Fetch all audit logs
router.get('/', verifyToken, isAdminOrTO, AuditLogController.getLogs);

module.exports = router;