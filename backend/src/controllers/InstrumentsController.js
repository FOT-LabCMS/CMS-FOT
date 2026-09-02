const { Instrument } = require('../models/index.js');
const { Op } = require('sequelize');
const { logAction } = require("../services/auditLogService.js");
const { deleteInstrumentImageFile } = require("../services/storageService.js");

const DEFAULT_PAGE_SIZE = 7;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Simple in-memory LRU-style cache to avoid re-querying the same
 * paginated/search results repeatedly. Keys are derived from query params.
 */
const listCache = new Map();

const getCacheKey = (params) => `v1:${JSON.stringify(params)}`;

const readCache = (key) => {
  const entry = listCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    listCache.delete(key);
    return null;
  }
  return entry.data;
};

const writeCache = (key, data) => {
  if (listCache.size >= 200) {
    const oldestKey = listCache.keys().next().value;
    listCache.delete(oldestKey);
  }
  listCache.set(key, { timestamp: Date.now(), data });
};

const clearInstrumentCache = () => {
  for (const key of listCache.keys()) {
    if (key.startsWith('v1:')) listCache.delete(key);
  }
};

const buildWhere = (search, inactiveOnly = false) => {
  const where = inactiveOnly ? { isActive: false } : { isActive: true };
  if (search && search.trim()) {
    const q = search.trim();
    where[Op.or] = [
      { name: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } },
    ];
  }
  return where;
};

const addInstrument = async (req, res) => {
  try {
    const payload = { ...req.body };

    // Normalize string fields
    if (payload.name !== undefined && payload.name !== null) {
      payload.name = String(payload.name).trim();
    }

    if (!payload.name) {
      if (req.instrumentImage) {
        await deleteInstrumentImageFile(req.instrumentImage.filename);
      }
      return res.status(400).json({
        success: false,
        message: 'Instrument name is required.',
      });
    }

    const existingInstrument = await Instrument.findOne({
      where: { name: { [Op.iLike]: payload.name } },
    });

    if (existingInstrument) {
      if (req.instrumentImage) {
        await deleteInstrumentImageFile(req.instrumentImage.filename);
      }
      return res.status(409).json({
        success: false,
        message: `An instrument with the name "${payload.name}" already exists.`,
      });
    }

    if (req.instrumentImage) {
      payload.imageUrl = `/uploads/instruments/${req.instrumentImage.filename}`;
    }

    const instrument = await Instrument.create(payload);

    await logAction({
      userId: req.user?.id,
      userName: req.user?.fullName,
      actionType: "CREATE_INSTRUMENT",
      entityType: "Instrument",
      entityId: instrument.id,
      details: {
        name: instrument.name,
        availability: instrument.availability,
        imageUrl: instrument.imageUrl,
      },
      ipAddress: req.ip,
    });

    clearInstrumentCache();

    res.status(201).json({
      success: true,
      message: 'Instrument created successfully',
      instrument,
    });
  } catch (error) {
    if (req.instrumentImage) {
      await deleteInstrumentImageFile(req.instrumentImage.filename);
    }
    console.error('Error creating instrument:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      const messages = error.errors.map(e => e.message);
      return res.status(409).json({ success: false, message: messages.join('. ') || 'Duplicate entry already exists.' });
    }
    res.status(500).json({ success: false, message: 'Internal server error while creating instrument.' });
  }
};

const getAllInstruments = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const isPaginated = page !== undefined && limit !== undefined;

    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || DEFAULT_PAGE_SIZE));
      const offset = (pageNum - 1) * limitNum;
      const where = buildWhere(search);

      const cacheKey = getCacheKey({ page: pageNum, limit: limitNum, search: search || '' });
      const cached = readCache(cacheKey);
      if (cached) {
        return res.status(200).json({ success: true, ...cached, fromCache: true });
      }

      const [instruments, total] = await Promise.all([
        Instrument.findAll({
          where,
          order: [['createdAt', 'DESC']],
          offset,
          limit: limitNum,
        }),
        Instrument.count({ where }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      const data = {
        instruments,
        pagination: { total, page: pageNum, limit: limitNum, totalPages },
      };
      writeCache(cacheKey, data);

      return res.status(200).json({ success: true, ...data });
    }

    const instruments = await Instrument.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
    });
    res.status(200).json({ success: true, instruments });
  } catch (error) {
    console.error('Error fetching instruments:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching instruments.' });
  }
};

const getPublicInstruments = async (req, res) => {
  try {
    const instruments = await Instrument.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'imageUrl', 'availability', 'tutorialVideo', 'warranty'],
    });
    res.status(200).json({ success: true, instruments });
  } catch (error) {
    console.error('Error fetching public instruments:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching instruments.' });
  }
};

const getInstrumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const instrument = await Instrument.findByPk(id);

    if (!instrument) {
      return res.status(404).json({ success: false, message: 'Instrument not found.' });
    }

    res.status(200).json({ success: true, instrument });
  } catch (error) {
    console.error(`Error fetching instrument with ID ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching instrument details.' });
  }
};

const updateInstrument = async (req, res) => {
  const { id } = req.params;
  try {
    const instrument = await Instrument.findByPk(id);

    if (!instrument) {
      if (req.instrumentImage) {
        await deleteInstrumentImageFile(req.instrumentImage.filename);
      }
      return res.status(404).json({ success: false, message: 'Instrument not found.' });
    }

    const beforeUpdate = {
      name: instrument.name,
      description: instrument.description,
      imageUrl: instrument.imageUrl,
      availability: instrument.availability,
      tutorialVideo: instrument.tutorialVideo,
      warranty: instrument.warranty,
      isActive: instrument.isActive,
    };

    const oldImageUrl = instrument.imageUrl;
    const payload = { ...req.body };

    if (payload.name !== undefined && payload.name !== null) {
      payload.name = String(payload.name).trim();
    }

    if (payload.name && payload.name.toLowerCase() !== instrument.name.toLowerCase()) {
      const existingInstrument = await Instrument.findOne({
        where: {
          name: { [Op.iLike]: payload.name },
          id: { [Op.ne]: id },
        },
      });
      if (existingInstrument) {
        if (req.instrumentImage) {
          await deleteInstrumentImageFile(req.instrumentImage.filename);
        }
        return res.status(409).json({
          success: false,
          message: `An instrument with the name "${payload.name}" already exists.`,
        });
      }
    }

    if (req.instrumentImage) {
      payload.imageUrl = `/uploads/instruments/${req.instrumentImage.filename}`;
    } else if (
      payload.removeImage === 'true' ||
      payload.removeImage === true ||
      payload.imageUrl === ''
    ) {
      payload.imageUrl = null;
    }

    await instrument.update(payload);

    if ((req.instrumentImage || payload.imageUrl === null) && oldImageUrl && oldImageUrl.startsWith('/uploads/instruments/')) {
      await deleteInstrumentImageFile(oldImageUrl);
    }

    await logAction({
      userId: req.user?.id,
      userName: req.user?.fullName,
      actionType: "UPDATE_INSTRUMENT",
      entityType: "Instrument",
      entityId: instrument.id,
      details: {
        before: beforeUpdate,
        after: payload,
      },
      ipAddress: req.ip,
    });

    clearInstrumentCache();

    res.status(200).json({
      success: true,
      message: 'Instrument updated successfully',
      instrument,
    });
  } catch (error) {
    if (req.instrumentImage) {
      await deleteInstrumentImageFile(req.instrumentImage.filename);
    }
    console.error(`Error updating instrument with ID ${id}:`, error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      const messages = error.errors.map(e => e.message);
      return res.status(409).json({ success: false, message: messages.join('. ') || 'Duplicate entry already exists.' });
    }
    res.status(500).json({ success: false, message: 'Internal server error while updating instrument.' });
  }
};

const softDeleteInstrument = async (req, res) => {
  const { id } = req.params;
  try {
    const instrument = await Instrument.findByPk(id);
    if (!instrument) {
      return res.status(404).json({ success: false, message: 'Instrument not found.' });
    }

    instrument.isActive = false;
    await instrument.save();

    await logAction({
      userId: req.user?.id,
      userName: req.user?.fullName,
      actionType: "DEACTIVATE_INSTRUMENT",
      entityType: "Instrument",
      entityId: instrument.id,
      details: { name: instrument.name },
      ipAddress: req.ip,
    });

    clearInstrumentCache();

    res.status(200).json({
      success: true,
      message: 'Instrument has been deactivated successfully.',
    });
  } catch (error) {
    console.error(`Error deactivating instrument with ID ${id}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error while deactivating instrument.' });
  }
};

const reactivateInstrument = async (req, res) => {
  const { id } = req.params;
  try {
    const instrument = await Instrument.findByPk(id);
    if (!instrument) {
      return res.status(404).json({ success: false, message: 'Instrument not found.' });
    }

    instrument.isActive = true;
    await instrument.save();

    await logAction({
      userId: req.user?.id,
      userName: req.user?.fullName,
      actionType: "REACTIVATE_INSTRUMENT",
      entityType: "Instrument",
      entityId: instrument.id,
      details: { name: instrument.name },
      ipAddress: req.ip,
    });

    clearInstrumentCache();

    res.status(200).json({
      success: true,
      message: 'Instrument has been reactivated successfully.',
      instrument,
    });
  } catch (error) {
    console.error(`Error reactivating instrument with ID ${id}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error while reactivating instrument.' });
  }
};

module.exports = {
  addInstrument,
  getAllInstruments,
  getPublicInstruments,
  getInstrumentById,
  updateInstrument,
  softDeleteInstrument,
  reactivateInstrument,
};