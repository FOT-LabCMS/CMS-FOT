const { Location, Batch, Chemical, sequelize } = require('../models/index.js');
const { Op } = require('sequelize');
const { logAction } = require('../services/auditLogService.js');

const addLocation = async (req, res) => {
  try {
    const { name, type, parentLocationId } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Location name and type are required.',
      });
    }

    // Explicitly handle empty string for parentLocationId to ensure it's treated as NULL in the query
    const parentId = (parentLocationId && parentLocationId.trim() !== '') ? parentLocationId : null;

    const existingLocation = await Location.findOne({
      where: {
        name: { [Op.iLike]: name.trim() },
        parentLocationId: parentId,
      }
    });

    if (existingLocation) {
      return res.status(409).json({
        success: false,
        message: `A location named "${name}" already exists at this level.`
      });
    }

    const newLocation = await Location.create({
      name: name.trim(),
      type,
      parentLocationId: parentId,
    });

    // Audit Log: Location Creation
    await logAction({
      userId: req.user?.id,
      userName: req.user?.fullName,
      actionType: "CREATE_LOCATION",
      entityType: "Location",
      entityId: newLocation.id,
      details: {
        name: newLocation.name,
        type: newLocation.type,
        parentLocationId: newLocation.parentLocationId,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'New location added successfully.',
      location: newLocation,
    });

  } catch (error) {
    console.error('Error adding new location:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: 'Internal server error while adding the location.' });
  }
};

const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.findAll({
      order: [['name', 'ASC']],
    });

    res.status(200).json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching locations.' });
  }
};

const getLocationStats = async (req, res) => {
  try {
    const [total, rootLocations] = await Promise.all([
      Location.count(),
      Location.count({ where: { parentLocationId: null } }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        rootLocations,
        childLocations: total - rootLocations,
      },
    });
  } catch (error) {
    console.error('Error fetching location stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching location stats.',
    });
  }
};

const getDescendants = async (locationId) => {
  const location = await Location.findByPk(locationId, {
    include: [
      {
        model: Batch,
        as: 'batches',
        include: [{
          model: Chemical,
          as: 'chemical',
          attributes: ['id', 'canonicalName', 'chemicalCode', 'baseUnit']
        }]
      }
    ],
    order: [
      ['name', 'ASC'],
      [{ model: Batch, as: 'batches' }, 'createdAt', 'DESC']
    ]
  });

  if (!location) return null;

  const children = await Location.findAll({ where: { parentLocationId: locationId }, order: [['name', 'ASC']] });
  const childHierarchies = await Promise.all(children.map(child => getDescendants(child.id)));

  location.dataValues.children = childHierarchies.filter(c => c !== null);
  return location;
};

const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const locationHierarchy = await getDescendants(id);
    if (!locationHierarchy) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }
    res.status(200).json({ success: true, location: locationHierarchy });
  } catch (error) {
    console.error(`Error fetching location with ID ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching location details.' });
  }
};

const getPublicLocationTree = async (req, res) => {
  try {
    const locations = await Location.findAll({
      attributes: ['id', 'name', 'type', 'parentLocationId'],
      order: [['name', 'ASC']],
    });

    const batches = await Batch.findAll({
      where: {
        locationId: { [Op.ne]: null },
        currentQuantity: { [Op.gt]: 0 }
      },
      attributes: ['id', 'batchNumber', 'currentQuantity', 'locationId'],
      include: [{
        model: Chemical,
        as: 'chemical',
        attributes: ['id', 'canonicalName', 'chemicalCode', 'baseUnit'],
        where: { isActive: true },
        required: true
      }]
    });

    const locationMap = {};
    const tree = [];

    locations.forEach(location => {
      locationMap[location.id] = { ...location.toJSON(), children: [], batches: [] };
    });

    batches.forEach(batch => {
      if (locationMap[batch.locationId]) {
        locationMap[batch.locationId].batches.push(batch.toJSON());
      }
    });

    Object.values(locationMap).forEach(location => {
      if (location.parentLocationId && locationMap[location.parentLocationId]) {
        locationMap[location.parentLocationId].children.push(location);
      } else {
        tree.push(location);
      }
    });

    res.status(200).json({ success: true, locations: tree });
  } catch (error) {
    console.error('Error fetching public location tree:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching locations.' });
  }
};

module.exports = {
  getAllLocations,
  getLocationStats,
  addLocation,
  getLocationById,
  getPublicLocationTree,
};
