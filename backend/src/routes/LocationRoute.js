const express = require('express');
const router = express.Router();
const LocationController = require('../controllers/LocationController.js');
const verifyToken = require('../middlewares/Authmiddleware.js');

// --- Public Routes ---
// For displaying the location tree on the public homepage
router.get('/public-tree', LocationController.getPublicLocationTree);

// --- Protected Routes (require authentication) ---
router.get('/stats', verifyToken, LocationController.getLocationStats);
router.get('/', verifyToken, LocationController.getAllLocations);
router.post('/add', verifyToken, LocationController.addLocation);
router.get('/:id', verifyToken, LocationController.getLocationById);

module.exports = router;
