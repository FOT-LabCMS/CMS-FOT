const { Batch, Chemical, Location, Dispose, sequelize } = require('../models/index.js');
const { Op } = require('sequelize');
const {
  notifyExpiredBatches,
  notifyExpiringBatches,
  notifyLowStockBatch,
  notifyLowStockBatches,
} = require('../services/notificationService.js');
const { logAction } = require('../services/auditLogService.js');

const BATCH_INCLUDES = [
  {
    model: Chemical,
    as: 'chemical',
    attributes: ['canonicalName', 'binCardNumber', 'baseUnit'],
  },
  {
    model: Location,
    as: 'location',
    attributes: ['name'],
  },
];

const computeBatchStatus = (batch, today, thirtyDaysFromNow) => {
  const currentQty = Number(batch.currentQuantity);
  const thresholdQty = Number(batch.lowStockThresholdQuantity);

  if (batch.isDisposed) return 'Disposed';
  if (currentQty <= 0) return 'Out of Stock';

  if (batch.expiryDate) {
    const expiry = new Date(batch.expiryDate);
    if (expiry < today) return 'Expired';
  }

  if (Number.isFinite(thresholdQty) && thresholdQty >= 0 && currentQty <= thresholdQty) {
    return 'Low Stock';
  }

  if (batch.expiryDate) {
    const expiry = new Date(batch.expiryDate);
    if (expiry <= thirtyDaysFromNow) return 'Expiring Soon';
  }

  return 'Good';
};

const getAllBatches = async (req, res) => {
  try {
    const { page, limit, search, status } = req.query;
    const isPaginated = page !== undefined && limit !== undefined;

    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const offset = (pageNum - 1) * limitNum;

      const where = {};
      if (search && search.trim()) {
        const q = search.trim();
        where[Op.or] = [
          { batchNumber: { [Op.iLike]: `%${q}%` } },
          { supplier: { [Op.iLike]: `%${q}%` } },
          { '$chemical.canonicalName$': { [Op.iLike]: `%${q}%` } },
          { '$chemical.binCardNumber$': { [Op.iLike]: `%${q}%` } },
        ];
      }

      const allMatching = await Batch.findAll({
        where: Object.keys(where).length ? where : undefined,
        include: BATCH_INCLUDES,
        order: [['receivedDate', 'DESC']],
        subQuery: false,
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const batchesWithStatus = allMatching.map((batch) => {
        const json = batch.toJSON();
        json._status = computeBatchStatus(json, today, thirtyDaysFromNow);
        return json;
      });

      const filtered = (status && status !== 'All')
        ? batchesWithStatus.filter((b) => b._status === status)
        : batchesWithStatus;

      const statusCounts = { All: batchesWithStatus.length };
      batchesWithStatus.forEach((b) => {
        statusCounts[b._status] = (statusCounts[b._status] || 0) + 1;
      });

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      const paginated = filtered.slice(offset, offset + limitNum);
      paginated.forEach((b) => { delete b._status; });

      return res.status(200).json({
        success: true,
        batches: paginated,
        pagination: { total, page: pageNum, limit: limitNum, totalPages },
        statusCounts,
      });
    }

    const batches = await Batch.findAll({
      include: BATCH_INCLUDES,
      order: [['receivedDate', 'DESC']],
    });

    res.status(200).json({ success: true, batches });
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

    await logAction({
      userId: req.user.id,
      userName: req.user.fullName,
      actionType: 'CREATE_BATCH',
      entityType: 'Batch',
      entityId: newBatch.id,
      details: {
        batchNumber: newBatch.batchNumber,
        chemicalId: newBatch.chemicalId,
        quantityReceived: newBatch.quantityReceived,
        currentQuantity: newBatch.currentQuantity,
        expiryDate: newBatch.expiryDate,
      },
      ipAddress: req.ip,
    });

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

    const batch = await Batch.findByPk(id, {
      include: [{ model: Chemical, as: 'chemical', attributes: ['canonicalName'] }],
    });

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

    await logAction({
      userId: req.user.id,
      userName: req.user.fullName,
      actionType: 'UPDATE_BATCH',
      entityType: 'Batch',
      entityId: batch.id,
      details: {
        batchNumber: batch.batchNumber,
        chemicalName: batch.chemical?.canonicalName || 'N/A',
      },
      ipAddress: req.ip,
    });

    const updatedBatch = await Batch.findByPk(id, {
      include: [
        {
          model: Chemical,
          as: 'chemical',
          attributes: ['canonicalName', 'binCardNumber', 'baseUnit'],
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
        'binCardNumber',
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

const disposeBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;

    if (!remark || !remark.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A disposal remark is required before disposing an expired batch.',
      });
    }

    const batch = await Batch.findByPk(id, {
      include: [
        { model: Chemical, as: 'chemical', attributes: ['canonicalName', 'binCardNumber', 'baseUnit'] },
        { model: Location, as: 'location', attributes: ['name'] },
      ],
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    if (batch.isDisposed) {
      return res.status(400).json({ success: false, message: 'This batch has already been disposed.' });
    }

    // Verify the batch is actually expired
    if (!batch.expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Only batches with an expiry date can be disposed this way.',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(batch.expiryDate);

    if (expiry >= today) {
      return res.status(400).json({
        success: false,
        message: 'This batch is not yet expired and cannot be disposed.',
      });
    }

    await batch.update({
      isDisposed: true,
      disposalRemark: remark.trim(),
      disposedAt: new Date(),
    });

    await logAction({
      userId: req.user.id,
      userName: req.user.fullName,
      actionType: 'DISPOSE_EXPIRED_BATCH',
      entityType: 'Batch',
      entityId: batch.id,
      details: {
        batchNumber: batch.batchNumber,
        chemicalName: batch.chemical?.canonicalName || 'N/A',
        expiryDate: batch.expiryDate,
        disposalRemark: remark.trim(),
      },
      ipAddress: req.ip,
    });

    const updatedBatch = await Batch.findByPk(id, {
      include: [
        { model: Chemical, as: 'chemical', attributes: ['canonicalName', 'binCardNumber', 'baseUnit'] },
        { model: Location, as: 'location', attributes: ['name'] },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Batch has been successfully marked as disposed.',
      batch: updatedBatch,
    });
  } catch (error) {
    console.error(`Error disposing batch with ID ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error while disposing the batch.' });
  }
};

module.exports = {
  addBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  disposeBatch,
  checkExpiryNotifications,
  checkLowStockNotifications,
  getBatchStats,
};
