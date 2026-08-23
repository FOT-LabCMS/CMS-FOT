const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController.js');
const verifyToken = require('../middlewares/Authmiddleware.js');

// Protect all report routes
router.use(verifyToken);

// Route to get data for the usage trend chart on the dashboard
router.get('/usage-trend', ReportController.getUsageTrend);

// Route to get data for a single chemical report
router.get('/chemical/:chemicalCode', ReportController.getChemicalReport);
router.get('/chemicals/:chemicalCode', ReportController.getChemicalReport);

// Route to download a PDF for a single chemical report
router.get('/chemical/:chemicalCode/download', ReportController.downloadChemicalReport);
router.get('/chemicals/:chemicalCode/download', ReportController.downloadChemicalReport);

// Route to get data for a usage report over a date range
router.get('/usage', ReportController.getUsageReport);

// Route to download a PDF for a usage report
router.get('/usage/download', ReportController.downloadUsageReport);

// Route to download a PDF for the full inventory
router.get('/inventory/download', ReportController.downloadFullInventoryReport);

module.exports = router;
