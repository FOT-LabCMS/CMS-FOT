const { Batch, Chemical, Location, Dispose, sequelize } = require('../models/index.js');
const { Op } = require('sequelize');
const {
  notifyExpiredBatches,
  notifyExpiringBatches,
  notifyLowStockBatch,
  notifyLowStockBatches,
} = require('../services/notificationService.js');

const getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.findAll({
      include: [
        {
          model: Chemical,
          as: 'chemical',
          attributes: ['canonicalName', 'chemicalCode', 'baseUnit'],
        },
        {
          model: Location,
          as: 'location',
          attributes: ['name'],
        },
      ],
      order: [['receivedDate', 'DESC']],
    });

    res.status(200).json({
      success: true,
      batches,
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching batches.' });
  }
};

const addBatch = async (req, res) => {
  try {
    const {
      chemicalId,
      supplier,
      batchNumber,
      quantityReceived,
      currentQuantity,
      lowStockThresholdQuantity,
      expiryDate,
      receivedDate,
      locationId,
    } = req.body;

    // --- Validation ---
    if (!chemicalId || !batchNumber || !quantityReceived || !receivedDate) {
      return res.status(400).json({
        success: false,
        message: 'Chemical, Batch Number, Quantity, and Received Date are required.',
      });
    }

    const thresholdQuantity = Number(lowStockThresholdQuantity);
    const receivedQuantity = Number(quantityReceived);

    if (lowStockThresholdQuantity === undefined || lowStockThresholdQuantity === '') {
      return res.status(400).json({
        success: false,
        message: 'Low stock threshold quantity is required.',
      });
    }

    if (Number.isNaN(thresholdQuantity) || thresholdQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Low stock threshold quantity must be zero or greater.',
      });
    }

    if (!Number.isNaN(receivedQuantity) && thresholdQuantity > receivedQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Low stock threshold quantity cannot be greater than the received quantity.',
      });
    }

    // Check if the chemical exists
    const chemical = await Chemical.findByPk(chemicalId);
    if (!chemical) {
      return res.status(404).json({
        success: false,
        message: 'The selected chemical does not exist.',
      });
    }

    // --- Create Batch ---
    const newBatch = await Batch.create({
      chemicalId,
      supplier: supplier?.trim() || null,
      batchNumber: batchNumber.trim(),
      quantityReceived,
      currentQuantity,
      lowStockThresholdQuantity: thresholdQuantity,
      expiryDate: expiryDate || null,
      receivedDate,
      locationId: locationId || null,
    });

    await notifyExpiredBatches();
    await notifyExpiringBatches();
    await notifyLowStockBatch(newBatch.id);

    res.status(201).json({
      success: true,
      message: 'New batch added successfully.',
      batch: newBatch,
    });

  } catch (error) {
    console.error('Error adding new batch:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: 'Internal server error while adding the batch.' });
  }
};

const checkLowStockNotifications = async (req, res) => {
  try {
    if (!['ADMIN', 'TECHNICAL_OFFICER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and technical officers can run low stock notification checks.',
      });
    }

    const result = await notifyLowStockBatches();

    if (result.error) {
      return res.status(500).json({
        success: false,
        message: 'Low stock notification check failed.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Low stock notification check completed.',
      result,
    });
  } catch (error) {
    console.error('Error checking low stock notifications:', error);
    res.status(500).json({ success: false, message: 'Internal server error while checking low stock notifications.' });
  }
};

const checkExpiryNotifications = async (req, res) => {
  try {
    if (!['ADMIN', 'TECHNICAL_OFFICER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and technical officers can run expiry notification checks.',
      });
    }

    const expiredResult = await notifyExpiredBatches();
    const expiryResult = await notifyExpiringBatches();

    if (expiredResult.error || expiryResult.error) {
      return res.status(500).json({
        success: false,
        message: 'Expiry notification check failed.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expiry notification check completed.',
      result: {
        expired: expiredResult,
        expiring: expiryResult,
      },
    });
  } catch (error) {
    console.error('Error checking expiry notifications:', error);
    res.status(500).json({ success: false, message: 'Internal server error while checking expiry notifications.' });
  }
};

const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier,
      batchNumber,
      quantityReceived,
      currentQuantity,
      lowStockThresholdQuantity,
      expiryDate,
      receivedDate,
      locationId,
    } = req.body;

    const batch = await Batch.findByPk(id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    if (!batchNumber || !quantityReceived || currentQuantity === undefined || !receivedDate) {
      return res.status(400).json({
        success: false,
        message: 'Batch Number, Quantity Received, Current Quantity, and Received Date are required.',
      });
    }

    const receivedQuantity = Number(quantityReceived);
    const availableQuantity = Number(currentQuantity);
    const thresholdQuantity = Number(lowStockThresholdQuantity);

    if (Number.isNaN(receivedQuantity) || receivedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity received must be greater than zero.',
      });
    }

    if (Number.isNaN(availableQuantity) || availableQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current quantity must be zero or greater.',
      });
    }

    if (availableQuantity > receivedQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Current quantity cannot be greater than quantity received.',
      });
    }

    if (lowStockThresholdQuantity === undefined || lowStockThresholdQuantity === '') {
      return res.status(400).json({
        success: false,
        message: 'Low stock threshold quantity is required.',
      });
    }

    if (Number.isNaN(thresholdQuantity) || thresholdQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Low stock threshold quantity must be zero or greater.',
      });
    }

    if (thresholdQuantity > receivedQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Low stock threshold quantity cannot be greater than the received quantity.',
      });
    }

    await batch.update({
      supplier: supplier?.trim() || null,
      batchNumber: batchNumber.trim(),
      quantityReceived: receivedQuantity,
      currentQuantity: availableQuantity,
      lowStockThresholdQuantity: thresholdQuantity,
      expiryDate: expiryDate || null,
      receivedDate,
      locationId: locationId || null,
    });

    await notifyExpiredBatches();
    await notifyExpiringBatches();
    await notifyLowStockBatch(batch.id);

    const updatedBatch = await Batch.findByPk(id, {
      include: [
        {
          model: Chemical,
          as: 'chemical',
          attributes: ['canonicalName', 'chemicalCode', 'baseUnit'],
        },
        {
          model: Location,
          as: 'location',
          attributes: ['name'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully.',
      batch: updatedBatch,
    });
  } catch (error) {
    console.error(`Error updating batch with ID ${req.params.id}:`, error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: 'Internal server error while updating the batch.' });
  }
};

const getLocationPath = async (locationId, LocationModel) => {
  const path = [];
  let currentLocation = await LocationModel.findByPk(locationId, { attributes: ['id', 'name', 'parentLocationId'] });
  while (currentLocation) {
    path.unshift({ id: currentLocation.id, name: currentLocation.name });
    if (currentLocation.parentLocationId) {
      currentLocation = await LocationModel.findByPk(currentLocation.parentLocationId, { attributes: ['id', 'name', 'parentLocationId'] });
    } else {
      currentLocation = null;
    }
  }
  return path;
};

const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findByPk(id, {
      include: [
        {
          model: Chemical,
          as: 'chemical',
        },
        {
          model: Location,
          as: 'location',
        },
      ],
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const batchJson = batch.toJSON();
    batchJson.usages = await Dispose.findAll({
      where: { batchNumber: batch.batchNumber },
      attributes: [
        'id',
        'chemicalCode',
        'chemicalName',
        'batchNumber',
        'quantityUsed',
        'dateReleased',
        'dateReturned',
        'purpose',
        'stuRegisterNum',
        'userName',
        'remark',
        'returnedStatus',
      ],
      order: [['dateReleased', 'DESC']],
    });

    // If a location is associated, fetch its full path
    if (batch.location) {
      const path = await getLocationPath(batch.location.id, Location);
      batchJson.location.path = path;
      return res.status(200).json({ success: true, batch: batchJson });
    }

    return res.status(200).json({ success: true, batch: batchJson });
  } catch (error) {
    console.error(`Error fetching batch with ID ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching batch details.' });
  }
};

const getBatchStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const lowStockCount = await Batch.count({
      where: {
        currentQuantity: { [Op.gt]: 0 },
        [Op.and]: sequelize.where(
          sequelize.col('current_quantity'),
          '<=',
          sequelize.col('low_stock_threshold_quantity')
        )
      },
      include: [{
        model: Chemical,
        as: 'chemical',
        where: { isActive: true },
        attributes: []
      }]
    });

    const expiringSoonCount = await Batch.count({
      where: {
        currentQuantity: { [Op.gt]: 0 },
        expiryDate: {
          [Op.ne]: null,
          [Op.gte]: today,
          [Op.lte]: thirtyDaysFromNow,
        },
      },
      include: [{
        model: Chemical,
        as: 'chemical',
        where: { isActive: true },
        attributes: []
      }]
    });

    const totalQuantities = await Batch.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('quantity_received')), 'totalReceived'],
        [sequelize.fn('SUM', sequelize.col('current_quantity')), 'totalCurrent'],
      ],
      include: [{
        model: Chemical,
        as: 'chemical',
        where: { isActive: true },
        attributes: []
      }],
      raw: true,
    });

    const totalReceived = Number(totalQuantities?.totalReceived || 0);
    const totalUsed = totalReceived - Number(totalQuantities?.totalCurrent || 0);
    const usagePercentage = totalReceived > 0 ? (totalUsed / totalReceived) * 100 : 0;

    res.status(200).json({
      success: true,
      stats: {
        lowStock: lowStockCount,
        expiringSoon: expiringSoonCount,
        totalUsed,
        totalReceived,
        usagePercentage,
      },
    });
  } catch (error) {
    console.error('Error fetching batch stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching batch stats.' });
  }
};

module.exports = {
  addBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  checkExpiryNotifications,
  checkLowStockNotifications,
  getBatchStats,
};
