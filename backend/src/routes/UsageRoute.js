const express = require("express");
const router = express.Router();
const UsageController = require("../controllers/UsageController");
const verifyToken = require('../middlewares/Authmiddleware.js');

router.get("/dashboard-trend", verifyToken, UsageController.getDashboardUsageTrend);
router.get("/hazard-category", verifyToken, UsageController.getUsageByHazardCategory);
router.get("/inventory-snapshot", verifyToken, UsageController.getInventorySnapshot);
router.get("/stock-risk-summary", verifyToken, UsageController.getStockRiskSummary);
router.get("/recent-returns", verifyToken, UsageController.getRecentReturnActivity);
router.get("/unassigned-stock", verifyToken, UsageController.getUnassignedStock);
router.get("/expiry-watchlist", verifyToken, UsageController.getExpiryWatchlist);
router.get("/batch-details", verifyToken, UsageController.retriveBatchDetails);
router.post(
  "/batch/calculate-usage",
  verifyToken,
  UsageController.calculateUsageBatchvise,
);
router.post(
  "/chemical/calculate-usage",
  verifyToken,
  UsageController.calculateUsageChemicalvise,
);

module.exports = router;
