const express = require('express');
const BatchController = require('../controllers/BatchController.js');
const verifyToken = require('../middlewares/Authmiddleware.js');

const router = express.Router();

const isAdminOrTO = (req, res, next) => {
  if (req.user.role === 'ADMIN' || req.user.role === 'TECHNICAL_OFFICER') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Only admins and technical officers can update batches.',
  });
};

// Route to get dashboard stats for batches
router.get('/stats', verifyToken, BatchController.getBatchStats);

// Route to get all batches
router.get('/', verifyToken, BatchController.getAllBatches);

// Route to get batch options for dashboard usage trend dropdowns
router.get('/dashboard-options', verifyToken, BatchController.getAllBatches);

// Route to add a new batch
router.post('/', verifyToken, BatchController.addBatch);

// Route to manually run expiry notification checks
router.post('/expiry-notifications/check', verifyToken, BatchController.checkExpiryNotifications);

// Route to manually run low stock notification checks
router.post('/low-stock-notifications/check', verifyToken, BatchController.checkLowStockNotifications);

// Route to get a single batch by ID
router.get('/:id', verifyToken, BatchController.getBatchById);

// Route to update a batch
router.put('/:id', verifyToken, isAdminOrTO, BatchController.updateBatch);

module.exports = router;
