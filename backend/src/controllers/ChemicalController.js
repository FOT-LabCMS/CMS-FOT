const { Chemical, Batch, Location, sequelize } = require('../models/index.js');
const { Op } = require('sequelize');
const { logAction } = require("../services/auditLogService.js");
const { createNotification } = require("../services/notificationService.js");
const {
  calculateFileChecksum,
  deleteSdsFile,
  resolveSdsFilePath,
  sdsFileExists,
  deleteImageFile,
} = require("../services/storageService.js");
const axios = require('axios');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const normalizeOptionalDate = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : null;
};



const addChemical = async (req, res) => {
  const imageFile = req.imageFile || (req.files && (req.files.imageFile?.[0] || req.files.image?.[0]));
  try {
    // When using multipart/form-data, arrays and other types might be stringified.
    const payload = { ...req.body };

    if (payload.synonyms && typeof payload.synonyms === 'string') {
      try {
        payload.synonyms = JSON.parse(payload.synonyms);
      } catch (e) {
        console.warn("Could not parse synonyms, defaulting to empty array.", payload.synonyms);
        payload.synonyms = [];
      }
    }

    payload.sdsRevisionDate = normalizeOptionalDate(payload.sdsRevisionDate);

    // Normalize binCardNumber and imageUrl
    if (payload.binCardNumber !== undefined && payload.binCardNumber !== null) {
      payload.binCardNumber = String(payload.binCardNumber).trim().toUpperCase();
    }

    if (payload.imageUrl !== undefined && payload.imageUrl !== null) {
      const trimmedUrl = String(payload.imageUrl).trim();
      payload.imageUrl = trimmedUrl ? trimmedUrl : null;
    }

    // Basic validation for required fields based on the model
    if (!payload.canonicalName || !payload.stockDimension || !payload.baseUnit || !payload.binCardNumber) {
      if (req.file) {
        await deleteSdsFile(req.file.filename);
      }
      if (imageFile) {
        await deleteImageFile(imageFile.filename);
      }
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields. Canonical name, Bin Card Number (BST###), stock dimension, and base unit are required.' 
      });
    }

    // Validate binCardNumber format (BST + 3 digits)
    if (!/^BST\d{3}$/.test(payload.binCardNumber)) {
      if (req.file) {
        await deleteSdsFile(req.file.filename);
      }
      if (imageFile) {
        await deleteImageFile(imageFile.filename);
      }
      return res.status(400).json({
        success: false,
        message: 'Bin Card Number must follow the format BST followed by exactly 3 digits (e.g. BST001).',
      });
    }

    // Check if a chemical with the same name or binCardNumber already exists (case-insensitive)
    const existingChemical = await Chemical.findOne({
      where: {
        [Op.or]: [
          { canonicalName: { [Op.iLike]: payload.canonicalName.trim() } },
          { binCardNumber: payload.binCardNumber },
        ],
      },
    });

    if (existingChemical) {
      if (req.file) {
        await deleteSdsFile(req.file.filename);
      }
      if (imageFile) {
        await deleteImageFile(imageFile.filename);
      }
      let field = 'Bin Card Number (BST###)';
      if (existingChemical.canonicalName.toLowerCase() === payload.canonicalName.trim().toLowerCase()) {
        field = 'canonical name';
      }
      return res.status(409).json({ 
        success: false, 
        message: `A chemical with that ${field} already exists.` 
      });
    }

    if (imageFile) {
      payload.imageUrl = `/uploads/images/${imageFile.filename}`;
    }

    // Add file info to the payload if a file was uploaded
    if (req.file) {
      payload.sdsStorageKey = req.file.filename; // Store filename only, not the full path
      payload.sdsOriginalFilename = req.file.originalname;
      payload.sdsMimeType = req.file.mimetype;
      payload.sdsFileSize = req.file.size;
      payload.sdsChecksum = await calculateFileChecksum(req.file.path);
      payload.sdsUploadedAt = new Date();
      payload.sdsUploadedById = req.user?.id; // From verifyToken middleware
    }

    // Create the new chemical in the database
    const chemical = await Chemical.create(payload);

    await createNotification({
      actor: {
        id: req.user.id,
        fullName: req.user.fullName,
      },
      entity: chemical,
      entityType: 'Chemical',
      type: 'NEW_CHEMICAL_ADDED',
      severity: 'INFO',
      messageBuilder: {
        actor: (createdChemical) =>
          `You added a new chemical: ${createdChemical.canonicalName} (${createdChemical.binCardNumber}).`,
        others: (actorName, createdChemical) =>
          `${actorName} added a new chemical: ${createdChemical.canonicalName} (${createdChemical.binCardNumber}).`,
      },
    });

    // Audit Log: Chemical Creation
    await logAction({
      userId: req.user?.id,
      userName: req.user?.fullName,
      actionType: "CREATE_CHEMICAL",
      entityType: "Chemical",
      entityId: chemical.id,
      details: {
        canonicalName: chemical.canonicalName,
        binCardNumber: chemical.binCardNumber,
        imageUrl: chemical.imageUrl,
        stockDimension: chemical.stockDimension,
        baseUnit: chemical.baseUnit,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Chemical created successfully',
      chemical,
    });
  } catch (error) {
    if (req.file) {
      await deleteSdsFile(req.file.filename);
    }
    if (imageFile) {
      await deleteImageFile(imageFile.filename);
    }
    console.error('Error creating chemical:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      const messages = error.errors.map(e => e.message);
      return res.status(409).json({ success: false, message: messages.join('. ') || 'Duplicate entry already exists.' });
    }
    res.status(500).json({ success: false, message: 'Internal server error while creating chemical.' });
  }
};

const getAllChemicals = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const isPaginated = page !== undefined && limit !== undefined;

    const buildWhere = () => {
      const where = { isActive: true };
      if (search && search.trim()) {
        const q = search.trim();
        where[Op.or] = [
          { canonicalName: { [Op.iLike]: `%${q}%` } },
          { binCardNumber: { [Op.iLike]: `%${q}%` } },
          { formula: { [Op.iLike]: `%${q}%` } },
        ];
      }
      return where;
    };

    // Only fetch active chemicals for the main list view
    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 8));
      const offset = (pageNum - 1) * limitNum;
      const where = buildWhere();

      const [chemicals, total] = await Promise.all([
        Chemical.findAll({
          where,
          order: [['createdAt', 'DESC']],
          offset,
          limit: limitNum,
        }),
        Chemical.count({ where }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      return res.status(200).json({
        success: true,
        chemicals,
        pagination: { total, page: pageNum, limit: limitNum, totalPages },
      });
    }

    const chemicals = await Chemical.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({
      success: true,
      chemicals,
    });
  } catch (error) {
    console.error('Error fetching chemicals:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching chemicals.' });
  }
};

const getInactiveChemicals = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const isPaginated = page !== undefined && limit !== undefined;

    const buildWhere = () => {
      const where = { isActive: false };
      if (search && search.trim()) {
        const q = search.trim();
        where[Op.or] = [
          { canonicalName: { [Op.iLike]: `%${q}%` } },
          { binCardNumber: { [Op.iLike]: `%${q}%` } },
          { formula: { [Op.iLike]: `%${q}%` } },
        ];
      }
      return where;
    };

    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 8));
      const offset = (pageNum - 1) * limitNum;
      const where = buildWhere();

      const [chemicals, total] = await Promise.all([
        Chemical.findAll({
          where,
          order: [['updatedAt', 'DESC']],
          offset,
          limit: limitNum,
        }),
        Chemical.count({ where }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      return res.status(200).json({
        success: true,
        chemicals,
        pagination: { total, page: pageNum, limit: limitNum, totalPages },
      });
    }

    const chemicals = await Chemical.findAll({
      where: { isActive: false },
      order: [['updatedAt', 'DESC']], // Order by when they were deactivated
    });
    res.status(200).json({
      success: true,
      chemicals,
    });
  } catch (error) {
    console.error('Error fetching inactive chemicals:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching inactive chemicals.' });
  }
};

const getPublicChemicals = async (req, res) => {
  try {
    const chemicals = await Chemical.findAll({
      where: { isActive: true },
      order: [['canonicalName', 'ASC']],
      attributes: [
        "id",
        "binCardNumber",
        "canonicalName",
        "formula",
        "physicalState",
        "hazardCategory",
        "stockDimension",
        "baseUnit",
        "sdsStorageKey",
        "imageUrl",
        [
          sequelize.literal(`(
            SELECT COALESCE(SUM(b.current_quantity), 0)
            FROM batches AS b
            WHERE b.chemical_id = "Chemical"."id"
          )`),
          "totalStock",
        ],
      ],
    });
    res.status(200).json({
      success: true,
      chemicals,
    });
  } catch (error) {
    console.error('Error fetching public chemicals:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching chemicals.' });
  }
};

// Helper to build the location path
const getLocationPath = async (locationId) => {
  const path = [];
  let currentLocation = await Location.findByPk(locationId, { attributes: ['id', 'name', 'parentLocationId'] });
  while (currentLocation) {
    path.unshift({ id: currentLocation.id, name: currentLocation.name });
    currentLocation = currentLocation.parentLocationId
      ? await Location.findByPk(currentLocation.parentLocationId, { attributes: ['id', 'name', 'parentLocationId'] })
      : null;
  }
  return path;
};

const getChemicalById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Optional JWT verification to check role for batch display
    const authHeader = req.headers.authorization;
    let user = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        // Ignore expired or invalid tokens for optional access checks
      }
    }

    const showBatches = user && (user.role === 'ADMIN' || user.role === 'TECHNICAL_OFFICER' || user.role === 'LECTURER');

    let chemical;
    if (showBatches) {
      chemical = await Chemical.findByPk(id, {
        include: [{
          model: Batch,
          as: 'batches',
          include: [{ model: Location, as: 'location', attributes: ['id', 'name'] }]
        }],
        order: [[{ model: Batch, as: 'batches' }, 'receivedDate', 'DESC']]
      });
    } else {
      chemical = await Chemical.findByPk(id);
    }

    if (!chemical) {
      return res.status(404).json({ success: false, message: 'Chemical not found.' });
    }

    const chemicalJson = chemical.toJSON();
    if (showBatches && chemicalJson.batches) {
      for (const batch of chemicalJson.batches) {
        if (batch.locationId) {
          batch.locationPath = await getLocationPath(batch.locationId);
        }
      }
    } else {
      delete chemicalJson.batches;
    }

    res.status(200).json({ success: true, chemical: chemicalJson });
  } catch (error) {
    console.error(`Error fetching chemical with ID ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching chemical details.' });
  }
};

const updateChemical = async (req, res) => {
  const { id } = req.params;
  const imageFile = req.imageFile || (req.files && (req.files.imageFile?.[0] || req.files.image?.[0]));
  try {
    const chemical = await Chemical.findByPk(id);

    if (!chemical) {
      if (req.file) {
        await deleteSdsFile(req.file.filename);
      }
      if (imageFile) {
        await deleteImageFile(imageFile.filename);
      }
      return res.status(404).json({ success: false, message: 'Chemical not found.' });
    }

    // Store the state *before* the update for the audit log
    const beforeUpdate = {
      canonicalName: chemical.canonicalName,
      binCardNumber: chemical.binCardNumber,
      imageUrl: chemical.imageUrl,
      casNumber: chemical.casNumber,
      hazardCategory: chemical.hazardCategory,
      isActive: chemical.isActive,
    };

    const oldSdsStorageKey = chemical.sdsStorageKey;
    const oldImageUrl = chemical.imageUrl;
    const payload = { ...req.body };

    if (payload.synonyms && typeof payload.synonyms === 'string') {
      try {
        payload.synonyms = JSON.parse(payload.synonyms);
      } catch (e) {
        console.warn("Could not parse synonyms on update, keeping original.", payload.synonyms);
        payload.synonyms = chemical.synonyms;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'sdsRevisionDate')) {
      payload.sdsRevisionDate = normalizeOptionalDate(payload.sdsRevisionDate);
    }

    if (payload.canonicalName && payload.canonicalName.trim().toLowerCase() !== chemical.canonicalName.toLowerCase()) {
      const existingChemical = await Chemical.findOne({
        where: {
          canonicalName: { [Op.iLike]: payload.canonicalName.trim() },
          id: { [Op.ne]: id }
        },
      });
      if (existingChemical) {
        if (req.file) {
          await deleteSdsFile(req.file.filename);
        }
        if (imageFile) {
          await deleteImageFile(imageFile.filename);
        }
        return res.status(409).json({
          success: false,
          message: `A chemical with the name "${payload.canonicalName}" already exists.`
        });
      }
    }

    // Handle binCardNumber update if provided
    if (payload.binCardNumber !== undefined && payload.binCardNumber !== null) {
      payload.binCardNumber = String(payload.binCardNumber).trim().toUpperCase();

      if (!/^BST\d{3}$/.test(payload.binCardNumber)) {
        if (req.file) await deleteSdsFile(req.file.filename);
        if (imageFile) await deleteImageFile(imageFile.filename);
        return res.status(400).json({
          success: false,
          message: 'Bin Card Number must follow the format BST followed by exactly 3 digits (e.g. BST001).',
        });
      }

      if (payload.binCardNumber !== chemical.binCardNumber) {
        const existingBin = await Chemical.findOne({
          where: {
            binCardNumber: payload.binCardNumber,
            id: { [Op.ne]: id },
          },
        });
        if (existingBin) {
          if (req.file) await deleteSdsFile(req.file.filename);
          if (imageFile) await deleteImageFile(imageFile.filename);
          return res.status(409).json({
            success: false,
            message: `A chemical with Bin Card Number "${payload.binCardNumber}" already exists.`,
          });
        }
      }
    }

    // Handle chemical image update
    if (imageFile) {
      payload.imageUrl = `/uploads/images/${imageFile.filename}`;
    } else if (payload.removeImage === 'true' || payload.removeImage === true || payload.imageUrl === '') {
      payload.imageUrl = null;
    }

    if (req.file) {
      payload.sdsStorageKey = req.file.filename; // Store filename only, not the full path
      payload.sdsOriginalFilename = req.file.originalname;
      payload.sdsMimeType = req.file.mimetype;
      payload.sdsFileSize = req.file.size;
      payload.sdsChecksum = await calculateFileChecksum(req.file.path);
      payload.sdsUploadedAt = new Date();
      payload.sdsUploadedById = req.user?.id;
    }

    await chemical.update(payload);

    // If replacement succeeded and an old file existed, remove the old file from disk
    if (req.file && oldSdsStorageKey && oldSdsStorageKey !== req.file.filename) {
      await deleteSdsFile(oldSdsStorageKey);
    }

    // If image replaced or removed, delete old image file if stored locally
    if ((imageFile || payload.imageUrl === null) && oldImageUrl && oldImageUrl.startsWith('/uploads/images/')) {
      await deleteImageFile(oldImageUrl);
    }

    // Audit Log: Chemical Update
    await logAction({
      userId: req.user?.id,
      userName: req.user?.fullName,
      actionType: "UPDATE_CHEMICAL",
      entityType: "Chemical",
      entityId: chemical.id,
      details: {
        before: beforeUpdate,
        after: payload, // Log the changes that were sent
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Chemical updated successfully',
      chemical,
    });
  } catch (error) {
    if (req.file) {
      // Discard newly uploaded file to avoid orphan and preserve old file
      await deleteSdsFile(req.file.filename);
    }
    if (imageFile) {
      await deleteImageFile(imageFile.filename);
    }
    console.error(`Error updating chemical with ID ${id}:`, error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      const messages = error.errors.map(e => e.message);
      return res.status(409).json({ success: false, message: messages.join('. ') || 'Duplicate entry already exists.' });
    }
    res.status(500).json({ success: false, message: 'Internal server error while updating chemical.' });
  }
};

const softDeleteChemical = async (req, res) => {
  const { id } = req.params;
  try {
    const chemical = await Chemical.findByPk(id);
    if (!chemical) {
      return res.status(404).json({ success: false, message: 'Chemical not found.' });
    }

    // Soft delete by setting isActive to false
    chemical.isActive = false;
    await chemical.save();

    // Audit Log: Deactivate Chemical
    await logAction({
      userId: req.user?.id,
      userName: req.user?.fullName,
      actionType: "DEACTIVATE_CHEMICAL",
      entityType: "Chemical",
      entityId: chemical.id,
      details: {
        binCardNumber: chemical.binCardNumber,
        canonicalName: chemical.canonicalName,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Chemical has been deactivated successfully.',
    });
  } catch (error) {
    console.error(`Error deactivating chemical with ID ${id}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error while deactivating chemical.' });
  }
};

const reactivateChemical = async (req, res) => {
  const { id } = req.params;
  try {
    const chemical = await Chemical.findByPk(id);
    if (!chemical) {
      return res.status(404).json({ success: false, message: 'Chemical not found.' });
    }

    // Reactivate by setting isActive to true
    chemical.isActive = true;
    await chemical.save();

    // Audit Log: Reactivate Chemical
    await logAction({
      userId: req.user?.id,
      userName: req.user?.fullName,
      actionType: "REACTIVATE_CHEMICAL",
      entityType: "Chemical",
      entityId: chemical.id,
      details: {
        binCardNumber: chemical.binCardNumber,
        canonicalName: chemical.canonicalName,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Chemical has been reactivated successfully.',
      chemical,
    });
  } catch (error) {
    console.error(`Error reactivating chemical with ID ${id}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error while reactivating chemical.' });
  }
};

const getChemicalsWithSds = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const isPaginated = page !== undefined && limit !== undefined;

    const buildWhere = () => {
      const where = {
        sdsStorageKey: { [Op.ne]: null },
        isActive: true,
      };
      if (search && search.trim()) {
        const q = search.trim();
        where[Op.or] = [
          { canonicalName: { [Op.iLike]: `%${q}%` } },
          { binCardNumber: { [Op.iLike]: `%${q}%` } },
          { formula: { [Op.iLike]: `%${q}%` } },
          { sdsOriginalFilename: { [Op.iLike]: `%${q}%` } },
          { sdsChecksum: { [Op.iLike]: `%${q}%` } },
        ];
      }
      return where;
    };

    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const offset = (pageNum - 1) * limitNum;
      const where = buildWhere();

      const [chemicals, total] = await Promise.all([
        Chemical.findAll({
          where,
          order: [['canonicalName', 'ASC']],
          offset,
          limit: limitNum,
          attributes: [
            'id',
            'binCardNumber',
            'canonicalName',
            'formula',
            'sdsStorageKey',
            'sdsOriginalFilename',
            'sdsMimeType',
            'sdsFileSize',
            'sdsChecksum',
            'sdsRevisionDate',
            'sdsUploadedAt',
          ],
        }),
        Chemical.count({ where }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      return res.status(200).json({
        success: true,
        chemicals,
        pagination: { total, page: pageNum, limit: limitNum, totalPages },
      });
    }

    const chemicals = await Chemical.findAll({
      where: {
        sdsStorageKey: { [Op.ne]: null },
        isActive: true,
      },
      order: [['canonicalName', 'ASC']],
      attributes: [
        'id',
        'binCardNumber',
        'canonicalName',
        'formula',
        'sdsStorageKey',
        'sdsOriginalFilename',
        'sdsMimeType',
        'sdsFileSize',
        'sdsChecksum',
        'sdsRevisionDate',
        'sdsUploadedAt',
      ],
    });
    res.status(200).json({
      success: true,
      chemicals,
    });
  } catch (error) {
    console.error('Error fetching chemicals with SDS:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching chemicals with SDS.' });
  }
};

const CAS_NUMBER_REGEX = /^\d{2,7}-\d{2}-\d$/;

/**
 * Validate CAS Registry Number checksum.
 *
 * Example: 7647-01-0
 */
const isValidCasNumber = (casNumber) => {
  if (!CAS_NUMBER_REGEX.test(casNumber)) {
    return false;
  }

  const digits = casNumber.replace(/-/g, '');
  const checkDigit = Number(digits.at(-1));
  const mainDigits = digits.slice(0, -1).split('').reverse();

  const sum = mainDigits.reduce(
    (total, digit, index) => total + Number(digit) * (index + 1),
    0
  );

  return sum % 10 === checkDigit;
};

/**
 * Convert common density units returned by PubChem
 * into units supported by this application.
 */
const normalizeDensityUnit = (unit = '') => {
  const normalized = unit
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/cm3/g, 'cm³')
    .replace(/cm\^3/g, 'cm³')
    .replace(/m3/g, 'm³')
    .replace(/m\^3/g, 'm³');

  const unitMap = {
    'g/ml': 'g/mL',
    'g/cm³': 'g/cm³',
    'kg/l': 'kg/L',
    'kg/m³': 'kg/m³',
  };

  return unitMap[normalized] || null;
};

/**
 * Try to extract a density value and unit from text.
 *
 * Supported examples:
 * 1.18 g/mL
 * 1.18 g/cu cm
 * 1000 kg/m3
 */
const parseDensityText = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const cleanedText = text
    .replace(/cu\.?\s*cm/gi, 'cm³')
    .replace(/cm\^?3/gi, 'cm³')
    .replace(/m\^?3/gi, 'm³');

  const match = cleanedText.match(
    /(\d+(?:\.\d+)?)\s*(g\/mL|g\/cm³|kg\/L|kg\/m³)/i
  );

  if (!match) {
    return null;
  }

  const densityValue = Number(match[1]);
  const densityUnit = normalizeDensityUnit(match[2]);

  if (!Number.isFinite(densityValue) || densityValue <= 0 || !densityUnit) {
    return null;
  }

  return {
    value: densityValue,
    unit: densityUnit,
    sourceText: text,
  };
};

/**
 * Recursively find PubChem sections whose heading contains "Density".
 */
const findDensitySections = (node, results = []) => {
  if (!node || typeof node !== 'object') {
    return results;
  }

  if (
    typeof node.TOCHeading === 'string' &&
    node.TOCHeading.toLowerCase().includes('density')
  ) {
    results.push(node);
  }

  Object.values(node).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => findDensitySections(item, results));
    } else if (value && typeof value === 'object') {
      findDensitySections(value, results);
    }
  });

  return results;
};

/**
 * Collect display strings from a PubChem information section.
 */
const collectPubChemStrings = (node, results = []) => {
  if (!node || typeof node !== 'object') {
    return results;
  }

  if (typeof node.String === 'string') {
    results.push(node.String);
  }

  if (typeof node.StringWithMarkup === 'string') {
    results.push(node.StringWithMarkup);
  }

  Object.values(node).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => collectPubChemStrings(item, results));
    } else if (value && typeof value === 'object') {
      collectPubChemStrings(value, results);
    }
  });

  return results;
};

const getChemicalDataByCas = async (req, res) => {
  try {
    const casNumber = String(req.params.casNumber || '').trim();

    if (!casNumber) {
      return res.status(400).json({
        success: false,
        message: 'CAS number is required.',
      });
    }

    if (!isValidCasNumber(casNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CAS number format or checksum.',
      });
    }

    const encodedCas = encodeURIComponent(casNumber);

    /*
     * Step 1:
     * Search PubChem using the CAS number and get its CID.
     */
    let cidResponse;

    try {
      cidResponse = await axios.get(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodedCas}/cids/JSON`,
        {
          timeout: 10000,
          headers: {
            Accept: 'application/json',
          },
        }
      );
    } catch (compoundSearchError) {
      /*
       * Some CAS identifiers may only be indexed under PubChem substances.
       * In that case, search substances and resolve them to compound CIDs.
       */
      cidResponse = await axios.get(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/substance/name/${encodedCas}/cids/JSON`,
        {
          timeout: 10000,
          headers: {
            Accept: 'application/json',
          },
        }
      );
    }

    const cid = cidResponse.data?.IdentifierList?.CID?.[0];

    if (!cid) {
      return res.status(404).json({
        success: false,
        message: 'No chemical was found for this CAS number.',
      });
    }

    /*
     * Step 2:
     * Get standard identity properties.
     */
    const propertyUrl =
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}` +
      '/property/Title,IUPACName,MolecularFormula/JSON';

    const propertyPromise = axios.get(propertyUrl, {
      timeout: 10000,
      headers: {
        Accept: 'application/json',
      },
    });

    /*
     * Step 3:
     * Get annotation data because density is normally stored
     * in PubChem's experimental property annotations.
     */
    const viewPromise = axios.get(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON`,
      {
        timeout: 15000,
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const [propertyResult, viewResult] = await Promise.allSettled([
      propertyPromise,
      viewPromise,
    ]);

    const properties =
      propertyResult.status === 'fulfilled'
        ? propertyResult.value.data?.PropertyTable?.Properties?.[0] || {}
        : {};

    let density = null;

    if (viewResult.status === 'fulfilled') {
      const densitySections = findDensitySections(viewResult.value.data);

      for (const section of densitySections) {
        const densityStrings = collectPubChemStrings(section);

        for (const text of densityStrings) {
          const parsedDensity = parseDensityText(text);

          if (parsedDensity) {
            density = parsedDensity;
            break;
          }
        }

        if (density) {
          break;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: density
        ? 'Chemical information and density were found.'
        : 'Chemical information was found, but density was unavailable.',
      chemical: {
        pubchemCid: cid,
        casNumber,
        canonicalName:
          properties.Title ||
          properties.IUPACName ||
          '',
        formula: properties.MolecularFormula || '',
        densityValue: density?.value ?? null,
        densityUnit: density?.unit ?? null,
        densitySourceText: density?.sourceText ?? null,
        source: 'PubChem',
      },
    });
  } catch (error) {
    console.error(
      'Error retrieving chemical information from PubChem:',
      error.response?.data || error.message
    );

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'No PubChem record was found for this CAS number.',
      });
    }

    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT'
    ) {
      return res.status(504).json({
        success: false,
        message: 'The chemical information service took too long to respond.',
      });
    }

    return res.status(502).json({
      success: false,
      message:
        'Unable to retrieve chemical information from the external service.',
    });
  }
};

const getChemicalStats = async (req, res) => {
  try {
    const activeCount = await Chemical.count({ where: { isActive: true } });
    const inactiveCount = await Chemical.count({ where: { isActive: false } });
    const sdsCount = await Chemical.count({
      where: {
        isActive: true,
        sdsStorageKey: { [Op.ne]: null },
      },
    });

    res.status(200).json({
      success: true,
      stats: {
        active: activeCount,
        inactive: inactiveCount,
        total: activeCount + inactiveCount,
        sdsCount: sdsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching chemical stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching chemical stats.' });
  }
};

const downloadSds = async (req, res) => {
  try {
    const { id } = req.params;
    const chemical = await Chemical.findByPk(id);

    if (!chemical) {
      return res.status(404).json({
        success: false,
        message: 'Chemical not found.',
      });
    }

    if (!chemical.sdsStorageKey) {
      return res.status(404).json({
        success: false,
        message: 'No SDS document is attached to this chemical.',
      });
    }

    let filePath;
    try {
      filePath = resolveSdsFilePath(chemical.sdsStorageKey);
    } catch (secErr) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SDS storage key or path traversal detected.',
      });
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'The requested SDS document file is missing from server storage.',
      });
    }

    const downloadFilename =
      chemical.sdsOriginalFilename || chemical.sdsStorageKey;

    res.download(filePath, downloadFilename, (err) => {
      if (err) {
        console.error('Error during SDS download transmission:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to complete SDS file download.',
          });
        }
      }
    });
  } catch (error) {
    console.error('Error downloading SDS:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error while downloading SDS document.',
      });
    }
  }
};

const resolveScanCode = async (req, res) => {
  try {
    let rawQuery = req.query.query || req.params.code || req.query.code;
    if (!rawQuery || typeof rawQuery !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A search query or QR code content is required.',
      });
    }

    rawQuery = rawQuery.trim();

    // 1. Check if the scanned value is a URL and extract ID/path
    let extractedId = null;
    const batchUrlMatch = rawQuery.match(/\/stock\/batches\/([0-9a-fA-F-]{36}|[^\/\?\#]+)/);
    const chemicalUrlMatch = rawQuery.match(/\/chemicals\/([0-9a-fA-F-]{36}|[^\/\?\#]+)/);

    if (batchUrlMatch) {
      extractedId = batchUrlMatch[1];
    } else if (chemicalUrlMatch) {
      extractedId = chemicalUrlMatch[1];
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const targetId = extractedId || rawQuery;

    // 2. If UUID, check Batch by PK, then Chemical by PK
    if (uuidRegex.test(targetId)) {
      const batch = await Batch.findByPk(targetId, {
        include: [{ model: Chemical, as: 'chemical' }, { model: Location, as: 'location' }],
      });
      if (batch && batch.chemical) {
        return res.status(200).json({
          success: true,
          matchType: 'BATCH_ID',
          chemicalId: batch.chemicalId,
          batchId: batch.id,
          batch,
          chemical: batch.chemical,
        });
      }

      const chemical = await Chemical.findByPk(targetId);
      if (chemical) {
        return res.status(200).json({
          success: true,
          matchType: 'CHEMICAL_ID',
          chemicalId: chemical.id,
          batchId: null,
          chemical,
        });
      }
    }

    // 3. Try matching Batch by batchNumber
    const batchByNumber = await Batch.findOne({
      where: {
        batchNumber: { [Op.iLike]: targetId },
      },
      include: [{ model: Chemical, as: 'chemical' }, { model: Location, as: 'location' }],
    });

    if (batchByNumber && batchByNumber.chemical) {
      return res.status(200).json({
        success: true,
        matchType: 'BATCH_NUMBER',
        chemicalId: batchByNumber.chemicalId,
        batchId: batchByNumber.id,
        batch: batchByNumber,
        chemical: batchByNumber.chemical,
      });
    }

    // chemicalCode resolving is removed

    // 5. Try matching Chemical by binCardNumber (e.g. BST001)
    const chemicalByBin = await Chemical.findOne({
      where: {
        binCardNumber: { [Op.iLike]: targetId.toUpperCase() },
      },
    });

    if (chemicalByBin) {
      return res.status(200).json({
        success: true,
        matchType: 'BIN_CARD_NUMBER',
        chemicalId: chemicalByBin.id,
        batchId: null,
        chemical: chemicalByBin,
      });
    }

    // 6. Try matching Chemical by canonicalName
    const chemicalByName = await Chemical.findOne({
      where: {
        canonicalName: { [Op.iLike]: `%${targetId}%` },
      },
    });

    if (chemicalByName) {
      return res.status(200).json({
        success: true,
        matchType: 'CHEMICAL_NAME',
        chemicalId: chemicalByName.id,
        batchId: null,
        chemical: chemicalByName,
      });
    }

    return res.status(404).json({
      success: false,
      message: `No chemical or batch found matching "${rawQuery}".`,
    });
  } catch (error) {
    console.error('Error resolving scan code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while resolving code.',
    });
  }
};

module.exports = {
  addChemical,
  getAllChemicals,
  updateChemical,
  getChemicalById,
  softDeleteChemical,
  getInactiveChemicals,
  reactivateChemical,
  getChemicalDataByCas,
  getChemicalsWithSds,
  getPublicChemicals,
  getChemicalStats,
  downloadSds,
  resolveScanCode,
};
